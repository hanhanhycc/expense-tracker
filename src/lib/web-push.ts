import webpush from "web-push";
import { prisma } from "@/lib/db";

let initialized = false;

function initVapid(): boolean {
  if (initialized) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  initialized = true;
  return true;
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
export async function sendWebPushToMember(memberId: string, payload: WebPushPayload): Promise<void> {
  if (!initVapid()) return;

  const subs = await prisma.pushSubscription.findMany({ where: { memberId } });
  if (subs.length === 0) return;

  const body = JSON.stringify(payload);
  const deadIds: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          // Subscription đã hết hiệu lực — dọn rác.
          deadIds.push(s.id);
        } else {
          // eslint-disable-next-line no-console
          console.error("[web-push] gửi thất bại:", err);
        }
      }
    }),
  );

  if (deadIds.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: deadIds } } }).catch(() => undefined);
  }
}

/**
 * Đếm số notification chưa đọc — dùng để gắn vào payload push (badge count).
 */
export async function countUnread(memberId: string): Promise<number> {
  return prisma.notification.count({ where: { recipientId: memberId, readAt: null } });
}
