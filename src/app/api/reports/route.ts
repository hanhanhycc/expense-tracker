import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { memberScopeFilter } from "@/features/transactions/server/service";

type Range = "30d" | "3m" | "6m" | "12m" | "ytd";

function resolveRange(input: string | null): { from: Date; to: Date; months: number; range: Range } {
  const range = (["30d", "3m", "6m", "12m", "ytd"].includes(input || "") ? (input as Range) : "6m");
  const now = new Date();
  const to = now;
  let from: Date;
  let months = 0;
  if (range === "30d") {
    from = new Date(now);
    from.setDate(from.getDate() - 29);
    months = 1;
  } else if (range === "ytd") {
    from = new Date(now.getFullYear(), 0, 1);
    months = now.getMonth() + 1;
  } else {
    const m = range === "3m" ? 3 : range === "6m" ? 6 : 12;
    months = m;
    from = new Date(now.getFullYear(), now.getMonth() - (m - 1), 1);
  }
  return { from, to, months, range };
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = session.user.familyId;
  const memberId = session.user.memberId;

  const url = new URL(req.url);
  const { from, to, months, range } = resolveRange(url.searchParams.get("range"));

  // Lấy dữ liệu của period hiện tại + period trước đó (để so sánh)
  const periodMs = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(from.getTime() - periodMs);

  const [txs, prevTxs] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        familyId,
        deletedAt: null,
        date: { gte: from, lte: to },
        AND: [memberScopeFilter(memberId)],
      },
      select: {
        amount: true,
        type: true,
        visibility: true,
        date: true,
        paidById: true,
        paidBy: { include: { user: true } },
        category: { select: { name: true, color: true, icon: true } },
      },
    }),
    prisma.transaction.findMany({
      where: {
        familyId,
        deletedAt: null,
        date: { gte: prevFrom, lte: prevTo },
        AND: [memberScopeFilter(memberId)],
      },
      select: { amount: true, type: true },
    }),
  ]);

  // Period totals
  const income = txs.filter((t) => t.type === "INCOME").reduce((s, t) => s + Number(t.amount), 0);
  const expense = txs.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0);
  const sharedExpense = txs.filter((t) => t.type === "EXPENSE" && t.visibility === "SHARED").reduce((s, t) => s + Number(t.amount), 0);
  const personalExpense = expense - sharedExpense;

  const prevIncome = prevTxs.filter((t) => t.type === "INCOME").reduce((s, t) => s + Number(t.amount), 0);
  const prevExpense = prevTxs.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0);

  function delta(cur: number, prev: number) {
    if (prev === 0) return cur > 0 ? 100 : 0;
    return ((cur - prev) / prev) * 100;
  }

  // Series: monthly nếu range > 30d, daily nếu = 30d
  let series: { label: string; income: number; expense: number }[];
  if (range === "30d") {
    const map = new Map<string, { label: string; income: number; expense: number }>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(to);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      map.set(key, { label: `${d.getDate()}/${d.getMonth() + 1}`, income: 0, expense: 0 });
    }
    for (const t of txs) {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const row = map.get(key);
      if (!row) continue;
      if (t.type === "INCOME") row.income += Number(t.amount);
      else row.expense += Number(t.amount);
    }
    series = Array.from(map.values());
  } else {
    const map = new Map<string, { label: string; income: number; expense: number }>();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(to.getFullYear(), to.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map.set(key, { label: `T${d.getMonth() + 1}`, income: 0, expense: 0 });
    }
    for (const t of txs) {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const row = map.get(key);
      if (!row) continue;
      if (t.type === "INCOME") row.income += Number(t.amount);
      else row.expense += Number(t.amount);
    }
    series = Array.from(map.values());
  }

  // By category (chi)
  const byCatMap = new Map<string, { name: string; color: string | null; icon: string | null; total: number }>();
  for (const t of txs) {
    if (t.type !== "EXPENSE") continue;
    const cur = byCatMap.get(t.category.name) || { name: t.category.name, color: t.category.color, icon: t.category.icon, total: 0 };
    cur.total += Number(t.amount);
    byCatMap.set(t.category.name, cur);
  }
  const byCategory = Array.from(byCatMap.values()).sort((a, b) => b.total - a.total);

  // By member (chi)
  const byMemberMap = new Map<string, { name: string; total: number }>();
  for (const t of txs) {
    if (t.type !== "EXPENSE") continue;
    const cur = byMemberMap.get(t.paidById) || { name: t.paidBy.user.name, total: 0 };
    cur.total += Number(t.amount);
    byMemberMap.set(t.paidById, cur);
  }
  const byMember = Array.from(byMemberMap.values()).sort((a, b) => b.total - a.total);

  return NextResponse.json({
    range,
    from: from.toISOString(),
    to: to.toISOString(),
    totals: {
      income,
      expense,
      balance: income - expense,
      personalExpense,
      sharedExpense,
    },
    deltas: {
      income: delta(income, prevIncome),
      expense: delta(expense, prevExpense),
    },
    series,
    byCategory,
    byMember,
  });
}

