import { prisma } from "@/lib/db";
import { CategoryKind, GoalStatus, Prisma, SplitType, Visibility } from "@prisma/client";
import { logActivity } from "@/lib/activity-log";
import { notifyShareRecipients } from "@/lib/notify";
import { formatVND, toDecimal } from "@/lib/money";
import { buildSettlementShares } from "./settlement";
import { canManageGoal } from "./permissions";

export const SETTLE_CATEGORY_NAME = "Tất toán tiết kiệm";

/** Tìm hoặc tạo danh mục thu nhập "Tất toán tiết kiệm" cho family (idempotent). */
async function getOrCreateSettleCategory(familyId: string): Promise<string> {
  const existing = await prisma.category.findFirst({
    where: { familyId, kind: CategoryKind.INCOME, name: SETTLE_CATEGORY_NAME },
    select: { id: true },
  });
  if (existing) return existing.id;

  // Ưu tiên đặt làm con của nhóm thu nhập gốc (cấu trúc 2 cấp mặc định).
  const incomeRoot = await prisma.category.findFirst({
    where: { familyId, kind: CategoryKind.INCOME, parentId: null },
    orderBy: { sortOrder: "asc" },
    select: { id: true, color: true },
  });
  const created = await prisma.category.create({
    data: {
      familyId,
      kind: CategoryKind.INCOME,
      name: SETTLE_CATEGORY_NAME,
      icon: "🐷",
      color: incomeRoot?.color ?? "#16a34a",
      isDefault: false,
      isEnabled: true,
      sortOrder: 99,
      parentId: incomeRoot?.id ?? null,
    },
    select: { id: true },
  });
  return created.id;
}

export type SettleResult =
  | { ok: true; transactionId: string; total: string }
  | { ok: false; status: number; error: string };

/**
 * Tất toán mục tiêu tiết kiệm:
 * - Tạo 1 giao dịch THU NHẬP = tổng đã đóng góp (ghi có vào dashboard).
 * - SHARED: chia CUSTOM theo đúng phần góp của từng member (residual model —
 *   người tất toán là payer, giữ phần góp của chính mình).
 * - Khoá mục tiêu: status = SETTLED.
 */
export async function settleSavingGoal(args: {
  familyId: string;
  goalId: string;
  actor: { userId: string; memberId: string; name: string; role: string };
}): Promise<SettleResult> {
  const { familyId, goalId, actor } = args;

  const goal = await prisma.savingGoal.findFirst({
    where: { id: goalId, familyId, deletedAt: null },
    include: { contributions: { select: { memberId: true, amount: true } } },
  });
  if (!goal) return { ok: false, status: 404, error: "Không tìm thấy mục tiêu" };

  if (!canManageGoal({ user: { role: actor.role, memberId: actor.memberId } }, goal)) {
    return { ok: false, status: 403, error: "Bạn không có quyền tất toán mục tiêu này" };
  }
  if (goal.status === GoalStatus.SETTLED) {
    return { ok: false, status: 400, error: "Mục tiêu đã được tất toán trước đó" };
  }

  // PERSONAL: chỉ creator được tất toán (đã check ở canManageGoal) → payer = creator.
  const payerId = goal.visibility === Visibility.PERSONAL ? goal.createdById : actor.memberId;
  const { total, shares } = buildSettlementShares(
    goal.contributions.map((c) => ({ memberId: c.memberId, amount: c.amount.toString() })),
    payerId,
  );
  if (!toDecimal(total).greaterThan(0)) {
    return { ok: false, status: 400, error: "Chưa có đóng góp nào để tất toán" };
  }

  const categoryId = await getOrCreateSettleCategory(familyId);
  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
  const note = `Tất toán sổ tiết kiệm "${goal.name}"`;

  let tx: { id: string; date: Date };
  try {
    tx = await prisma.$transaction(async (db) => {
      const created = await db.transaction.create({
        data: {
          familyId,
          amount: new Prisma.Decimal(total),
          type: "INCOME",
          categoryId,
          note,
          date: today,
          createdById: payerId,
          paidById: payerId,
          visibility: goal.visibility,
          splitType: shares.length > 0 ? SplitType.CUSTOM : SplitType.NONE,
          shares: shares.length
            ? { createMany: { data: shares.map((s) => ({ memberId: s.memberId, amount: new Prisma.Decimal(s.amount) })) } }
            : undefined,
        },
        select: { id: true, date: true },
      });
      // Guard chống double-settle khi 2 request đua nhau: chỉ update khi chưa SETTLED.
      const updated = await db.savingGoal.updateMany({
        where: { id: goalId, status: { not: GoalStatus.SETTLED }, deletedAt: null },
        data: { status: GoalStatus.SETTLED, settledAt: new Date(), settledTxId: created.id },
      });
      if (updated.count === 0) throw new Error("ALREADY_SETTLED");
      return created;
    });
  } catch (e) {
    if (e instanceof Error && e.message === "ALREADY_SETTLED") {
      return { ok: false, status: 400, error: "Mục tiêu đã được tất toán trước đó" };
    }
    throw e;
  }

  await logActivity({
    familyId,
    actorId: actor.userId,
    actorName: actor.name,
    action: "SETTLE",
    entity: "saving_goal",
    entityId: goalId,
    summary: `Tất toán mục tiêu "${goal.name}" — ${formatVND(total)} ghi có vào thu nhập`,
    metadata: { transactionId: tx.id },
  });

  if (shares.length > 0) {
    await notifyShareRecipients({
      familyId,
      actor: { memberId: actor.memberId, name: actor.name },
      tx: { id: tx.id, amount: total, note, date: tx.date, type: "INCOME" },
      shares,
      notifType: "TRANSACTION_SHARED",
    });
  }

  return { ok: true, transactionId: tx.id, total };
}
