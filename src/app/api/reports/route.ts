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
        createdById: true,
        paidById: true,
        paidBy: { include: { user: true } },
        shares: { select: { memberId: true, amount: true } },
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
      select: {
        amount: true,
        type: true,
        visibility: true,
        createdById: true,
        shares: { select: { memberId: true, amount: true } },
      },
    }),
  ]);

  /**
   * Phần thuộc về `memberId` trong giao dịch:
   * - PERSONAL: full amount nếu là người tạo, ngược lại 0.
   * - SHARED: số tiền trong shares của member (0 nếu không có).
   */
  type ShareLike = { memberId: string; amount: { toString(): string } };
  function memberPart(t: {
    amount: { toString(): string };
    visibility: "PERSONAL" | "SHARED";
    createdById: string;
    paidById: string;
    shares: ShareLike[];
  }): number {
    if (t.visibility === "PERSONAL") {
      return t.createdById === memberId ? Number(t.amount) : 0;
    }
    const s = t.shares.find((x) => x.memberId === memberId);
    if (s) return Number(s.amount);
    if (t.paidById === memberId) {
      const totalShared = t.shares.reduce((sum, x) => sum + Number(x.amount), 0);
      const residual = Number(t.amount) - totalShared;
      return residual > 0 ? residual : 0;
    }
    return 0;
  }

  // Period totals — theo phần của member
  let income = 0;
  let expense = 0;
  let sharedExpense = 0;
  let personalExpense = 0;
  for (const t of txs) {
    const part = memberPart(t);
    if (part === 0) continue;
    if (t.type === "INCOME") income += part;
    else {
      expense += part;
      if (t.visibility === "SHARED") sharedExpense += part;
      else personalExpense += part;
    }
  }

  let prevIncome = 0;
  let prevExpense = 0;
  for (const t of prevTxs) {
    const part = memberPart(t);
    if (part === 0) continue;
    if (t.type === "INCOME") prevIncome += part;
    else prevExpense += part;
  }

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
      const part = memberPart(t);
      if (part === 0) continue;
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const row = map.get(key);
      if (!row) continue;
      if (t.type === "INCOME") row.income += part;
      else row.expense += part;
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
      const part = memberPart(t);
      if (part === 0) continue;
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const row = map.get(key);
      if (!row) continue;
      if (t.type === "INCOME") row.income += part;
      else row.expense += part;
    }
    series = Array.from(map.values());
  }

  // By category (chi) — theo phần của member
  const byCatMap = new Map<string, { name: string; color: string | null; icon: string | null; total: number }>();
  for (const t of txs) {
    if (t.type !== "EXPENSE") continue;
    const part = memberPart(t);
    if (part === 0) continue;
    const cur = byCatMap.get(t.category.name) || { name: t.category.name, color: t.category.color, icon: t.category.icon, total: 0 };
    cur.total += part;
    byCatMap.set(t.category.name, cur);
  }
  const byCategory = Array.from(byCatMap.values()).sort((a, b) => b.total - a.total);

  // By member (chi) — theo người trả tiền (cash flow). Giữ nguyên logic cũ.
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

