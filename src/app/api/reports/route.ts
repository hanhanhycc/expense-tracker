import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { memberScopeFilter } from "@/features/transactions/server/service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = session.user.familyId;
  const memberId = session.user.memberId;

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const txs = await prisma.transaction.findMany({
    where: {
      familyId,
      deletedAt: null,
      date: { gte: start },
      AND: [memberScopeFilter(memberId)],
    },
    select: {
      amount: true,
      type: true,
      visibility: true,
      date: true,
      paidById: true,
      paidBy: { include: { user: true } },
      category: { select: { name: true, color: true } },
    },
  });

  // monthly income vs expense (12 tháng)
  const monthly = new Map<string, { month: string; income: number; expense: number }>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthly.set(key, { month: key, income: 0, expense: 0 });
  }
  for (const t of txs) {
    const key = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, "0")}`;
    const row = monthly.get(key);
    if (!row) continue;
    if (t.type === "INCOME") row.income += Number(t.amount);
    else row.expense += Number(t.amount);
  }

  // by category (chi)
  const byCat = new Map<string, { name: string; color: string | null; total: number }>();
  for (const t of txs) {
    if (t.type !== "EXPENSE") continue;
    const cur = byCat.get(t.category.name) || { name: t.category.name, color: t.category.color, total: 0 };
    cur.total += Number(t.amount);
    byCat.set(t.category.name, cur);
  }

  // by member (chi)
  const byMember = new Map<string, { name: string; total: number }>();
  for (const t of txs) {
    if (t.type !== "EXPENSE") continue;
    const cur = byMember.get(t.paidById) || { name: t.paidBy.user.name, total: 0 };
    cur.total += Number(t.amount);
    byMember.set(t.paidById, cur);
  }

  const sharedExpenseTotal = txs
    .filter((t) => t.type === "EXPENSE" && t.visibility === "SHARED")
    .reduce((s, t) => s + Number(t.amount), 0);

  return NextResponse.json({
    monthly: Array.from(monthly.values()),
    byCategory: Array.from(byCat.values()).sort((a, b) => b.total - a.total),
    byMember: Array.from(byMember.values()).sort((a, b) => b.total - a.total),
    sharedExpenseTotal,
  });
}
