import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

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
  amount: string;
  spent: string;
  percent: number;
};

/**
 * Liệt kê tất cả EXPENSE category, mỗi category 1 dòng:
 * - Có ngân sách → trả về amount
 * - Chưa có → amount = "0"
 * spent = tổng EXPENSE của category đó trong tháng (toàn family, không filter member scope).
 */
export async function listBudgetsForMonth(familyId: string, month: string): Promise<BudgetWithSpent[]> {
  const from = monthDate(month);
  const to = nextMonthDate(month);

  const [cats, budgets, txs] = await Promise.all([
    prisma.category.findMany({
      where: { familyId, kind: "EXPENSE" },
      orderBy: { name: "asc" },
    }),
    prisma.budget.findMany({ where: { familyId, month: from } }),
    prisma.transaction.findMany({
      where: {
        familyId,
        deletedAt: null,
        type: "EXPENSE",
        date: { gte: from, lt: to },
      },
      select: { categoryId: true, amount: true },
    }),
  ]);

  const spentMap = new Map<string, Prisma.Decimal>();
  for (const t of txs) {
    const cur = spentMap.get(t.categoryId) ?? new Prisma.Decimal(0);
    spentMap.set(t.categoryId, cur.plus(t.amount));
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
      amount: amount.toString(),
      spent: spent.toString(),
      percent,
    };
  });
}

export async function upsertBudget(familyId: string, categoryId: string, month: string, amount: number) {
  const cat = await prisma.category.findFirst({ where: { id: categoryId, familyId, kind: "EXPENSE" } });
  if (!cat) throw new Error("Danh mục không hợp lệ");
  const monthD = monthDate(month);
  if (amount <= 0) {
    await prisma.budget.deleteMany({ where: { familyId, categoryId, month: monthD } });
    return null;
  }
  return prisma.budget.upsert({
    where: { familyId_categoryId_month: { familyId, categoryId, month: monthD } },
    create: { familyId, categoryId, month: monthD, amount: new Prisma.Decimal(amount) },
    update: { amount: new Prisma.Decimal(amount) },
  });
}

/**
 * Top N ngân sách "đáng chú ý" cho dashboard:
 * - Chỉ category có amount > 0
 * - Sắp theo % giảm dần
 */
export async function topBudgets(familyId: string, month: string, limit = 4) {
  const all = await listBudgetsForMonth(familyId, month);
  return all
    .filter((b) => Number(b.amount) > 0)
    .sort((a, b) => b.percent - a.percent)
    .slice(0, limit);
}
