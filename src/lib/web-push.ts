import webpush from "web-push";
import { prisma } from "@/lib/db";

let initialized = false;
let warnedNotConfigured = false;

function initVapid(): boolean {
  if (initialized) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    if (!warnedNotConfigured) {
      warnedNotConfigured = true;
      // eslint-disable-next-line no-console
      console.warn(
        "[web-push] VAPID chưa cấu hình. Thiếu:",
        [!publicKey && "NEXT_PUBLIC_VAPID_PUBLIC_KEY", !privateKey && "VAPID_PRIVATE_KEY", !subject && "VAPID_SUBJECT"]
          .filter(Boolean)
          .join(", "),
        "→ web push disabled, chỉ in-app notification chạy.",
      );
    }
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  initialized = true;
  // eslint-disable-next-line no-console
  console.log("[web-push] VAPID đã init OK.");
  return true;
}

export function isWebPushConfigured(): boolean {
  return initVapid();
}

export type WebPushPayload = {
  title: string;
  body: string;
  url?: string;
  unreadCount?: number;
  tag?: string;
};

/**
 * Gửi web push tới tất cả subscription của 1 member.
 * Tự động dọn subscription expired (410/404).
 * Không bao giờ throw — log và nuốt lỗi để không phá flow chính.
 */
export type PushResult = {
  sent: number;
  removed: number;
  failed: number;
  configured: boolean;
  errors: string[];
};

export async function sendWebPushToMember(memberId: string, payload: WebPushPayload): Promise<PushResult> {
  const result: PushResult = { sent: 0, removed: 0, failed: 0, configured: false, errors: [] };

  if (!initVapid()) {
    return result;
  }
  result.configured = true;

  const subs = await prisma.pushSubscription.findMany({ where: { memberId } });
  if (subs.length === 0) {
    // eslint-disable-next-line no-console
    console.log(`[web-push] member ${memberId} chưa có subscription nào.`);
    return result;
  }

  const body = JSON.stringify(payload);
  const deadIds: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
        );
        result.sent += 1;
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        const msg = (err as { message?: string })?.message ?? String(err);
        if (status === 404 || status === 410) {
          // Subscription đã hết hiệu lực — dọn rác.
          deadIds.push(s.id);
          result.removed += 1;
        } else {
          result.failed += 1;
          result.errors.push(`status=${status ?? "?"} ${msg}`);
          // eslint-disable-next-line no-console
          console.error("[web-push] gửi thất bại:", { status, msg, endpoint: s.endpoint.slice(0, 60) + "..." });
        }
      }
    }),
  );

  if (deadIds.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: deadIds } } }).catch(() => undefined);
  }

  // eslint-disable-next-line no-console
  console.log(`[web-push] member ${memberId}: sent=${result.sent} removed=${result.removed} failed=${result.failed}`);

  return result;
}

/**
 * Đếm số notification chưa đọc — dùng để gắn vào payload push (badge count).
 */
export async function countUnread(memberId: string): Promise<number> {
  return prisma.notification.count({ where: { recipientId: memberId, readAt: null } });
}
