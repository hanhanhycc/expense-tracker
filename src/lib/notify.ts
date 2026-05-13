import { prisma } from "@/lib/db";
import { formatVND } from "@/lib/money";
import type { Prisma } from "@prisma/client";

export type NotificationType = "TRANSACTION_SHARED" | "TRANSACTION_SHARE_UPDATED";

type ShareInput = { memberId: string; amount: string | number };

type TxSnapshot = {
  id: string;
  amount: string | number;
  note?: string | null;
  date: Date;
  type: "INCOME" | "EXPENSE";
};

type ActorSnapshot = {
  memberId: string;
  name: string;
};

/**
 * Tạo notification cho mỗi member được share giao dịch.
 * Skip actor (người tạo) — họ không cần tự thông báo mình.
 * Không bao giờ throw — log lỗi & nuốt để không phá flow chính.
 */
export async function notifyShareRecipients(args: {
  familyId: string;
  actor: ActorSnapshot;
  tx: TxSnapshot;
  shares: ShareInput[];
  notifType: NotificationType;
}): Promise<void> {
  const { familyId, actor, tx, shares, notifType } = args;
  const recipients = shares
    .filter((s) => s.memberId !== actor.memberId)
    .map((s) => ({ memberId: s.memberId, amount: s.amount }));

  if (recipients.length === 0) return;

  const verb = notifType === "TRANSACTION_SHARED" ? "đã chia sẻ" : "đã cập nhật";
  const noteSuffix = tx.note ? ` "${tx.note}"` : "";

  const rows: Prisma.NotificationCreateManyInput[] = recipients.map((r) => {
    const isZero = String(r.amount) === "0";
    const sharePart = isZero ? "" : `, phần của bạn ${formatVND(r.amount)}`;
    return ({
    familyId,
    recipientId: r.memberId,
    actorId: actor.memberId,
    actorName: actor.name,
    type: notifType,
    entity: "transaction",
    entityId: tx.id,
    summary: `${actor.name} ${verb} giao dịch${noteSuffix}${sharePart}`,
    metadata: {
      transactionId: tx.id,
      shareAmount: String(r.amount),
      totalAmount: String(tx.amount),
      txType: tx.type,
      date: tx.date.toISOString(),
    } as Prisma.InputJsonValue,
  });
  });

  try {
    await prisma.notification.createMany({ data: rows });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[notify] tạo notification thất bại:", e);
  }
}
