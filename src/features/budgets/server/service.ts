import { prisma } from "@/lib/db";
import { Prisma, BudgetScope } from "@prisma/client";

export function monthDate(month: string): Date {
  // month "YYYY-MM" -> Date(YYYY,MM-1,1) in UTC
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1));
}

export function nextMonthDate(month: string): Date {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 1));
}

export type BudgetWithSpent = {
  id: string | null;
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  month: string;
  scope: "PERSONAL" | "SHARED";
  memberId: string | null;
  amount: string;
  spent: string;
  percent: number;
};

type TxForSpent = {
  categoryId: string;
  amount: Prisma.Decimal;
  visibility: "PERSONAL" | "SHARED";
  createdById: string;
  shares: { memberId: string; amount: Prisma.Decimal }[];
};

/**
 * Phần chi tiêu thuộc về `memberId` trong 1 giao dịch:
 * - PERSONAL: full amount nếu là người tạo, ngược lại 0.
 * - SHARED: số tiền trong `shares` của member (0 nếu không có).
 */
function memberCost(t: TxForSpent, memberId: string): Prisma.Decimal {
  if (t.visibility === "PERSONAL") {
    return t.createdById === memberId ? t.amount : new Prisma.Decimal(0);
  }
  const s = t.shares.find((x) => x.memberId === memberId);
  return s ? s.amount : new Prisma.Decimal(0);
}

/**
 * Liệt kê ngân sách theo scope:
 * - PERSONAL: cần `memberId`. spent = tổng share của member theo category trong tháng
 *   (giao dịch PERSONAL của chính member + phần chia trong giao dịch SHARED).
 * - SHARED: spent = tổng amount full của các giao dịch SHARED EXPENSE trong category, tháng.
 */
export async function listBudgetsForMonth(
  familyId: string,
  month: string,
  scope: BudgetScope,
  memberId: string | null,
): Promise<BudgetWithSpent[]> {
  if (scope === "PERSONAL" && !memberId) {
    throw new Error("Ngân sách cá nhân cần memberId");
  }
  const from = monthDate(month);
  const to = nextMonthDate(month);

  const [cats, budgets, txs] = await Promise.all([
    prisma.category.findMany({
      where: { familyId, kind: "EXPENSE" },
      orderBy: { name: "asc" },
    }),
    prisma.budget.findMany({
      where: {
        familyId,
        month: from,
        scope,
        memberId: scope === "PERSONAL" ? memberId : null,
      },
    }),
    prisma.transaction.findMany({
      where: {
        familyId,
        deletedAt: null,
        type: "EXPENSE",
        date: { gte: from, lt: to },
        ...(scope === "SHARED" ? { visibility: "SHARED" as const } : {}),
      },
      select: {
        categoryId: true,
        amount: true,
        visibility: true,
        createdById: true,
        shares: { select: { memberId: true, amount: true } },
      },
    }),
  ]);

  const spentMap = new Map<string, Prisma.Decimal>();
  for (const t of txs) {
    const add =
      scope === "PERSONAL"
        ? memberCost(t, memberId as string)
        : t.amount;
    if (add.isZero()) continue;
    const cur = spentMap.get(t.categoryId) ?? new Prisma.Decimal(0);
    spentMap.set(t.categoryId, cur.plus(add));
  }
  const budgetMap = new Map(budgets.map((b) => [b.categoryId, b]));

  return cats.map((c) => {
    const b = budgetMap.get(c.id);
    const amount = b ? b.amount : new Prisma.Decimal(0);
    const spent = spentMap.get(c.id) ?? new Prisma.Decimal(0);
    const amt = Number(amount);
    const sp = Number(spent);
    const percent = amt > 0 ? Math.min(999, (sp / amt) * 100) : 0;
    return {
      id: b?.id ?? null,
      categoryId: c.id,
      categoryName: c.name,
      categoryIcon: c.icon,
      categoryColor: c.color,
      month,
      scope,
      memberId: scope === "PERSONAL" ? memberId : null,
      amount: amount.toString(),
      spent: spent.toString(),
      percent,
    };
  });
}

export async function upsertBudget(
  familyId: string,
  categoryId: string,
  month: string,
  amount: number,
  scope: BudgetScope,
  memberId: string | null,
) {
  if (scope === "PERSONAL" && !memberId) {
    throw new Error("Ngân sách cá nhân cần memberId");
  }
  const cat = await prisma.category.findFirst({ where: { id: categoryId, familyId, kind: "EXPENSE" } });
  if (!cat) throw new Error("Danh mục không hợp lệ");
  if (scope === "PERSONAL") {
    const m = await prisma.familyMember.findFirst({ where: { id: memberId as string, familyId } });
    if (!m) throw new Error("Thành viên không hợp lệ");
  }
  const monthD = monthDate(month);
  const ownerMemberId = scope === "PERSONAL" ? memberId : null;

  // Tìm bản ghi hiện có theo (familyId, categoryId, month, scope, memberId)
  const existing = await prisma.budget.findFirst({
    where: {
      familyId,
      categoryId,
      month: monthD,
      scope,
      memberId: ownerMemberId,
    },
  });

  if (amount <= 0) {
    if (existing) await prisma.budget.delete({ where: { id: existing.id } });
    return null;
  }

  if (existing) {
    return prisma.budget.update({
      where: { id: existing.id },
      data: { amount: new Prisma.Decimal(amount) },
    });
  }
  return prisma.budget.create({
    data: {
      familyId,
      categoryId,
      month: monthD,
      amount: new Prisma.Decimal(amount),
      scope,
      memberId: ownerMemberId,
    },
  });
}

/**
 * Top N ngân sách CÁ NHÂN của member cho dashboard:
 * - Chỉ category có amount > 0
 * - Sắp theo % giảm dần
 */
export async function topPersonalBudgets(familyId: string, memberId: string, month: string, limit = 4) {
  const all = await listBudgetsForMonth(familyId, month, "PERSONAL", memberId);
  return all
    .filter((b) => Number(b.amount) > 0)
    .sort((a, b) => b.percent - a.percent)
    .slice(0, limit);
}
