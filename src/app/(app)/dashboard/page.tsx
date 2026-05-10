import { requireAuth } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { monthSummary } from "@/features/transactions/server/service";
import { endOfMonth, startOfMonth, formatDate } from "@/lib/date";
import { formatVND } from "@/lib/money";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireAuth();
  const familyId = session.user.familyId;
  const from = startOfMonth();
  const to = endOfMonth();

  const [summary, recent, goals] = await Promise.all([
    monthSummary(familyId, from, to),
    prisma.transaction.findMany({
      where: { familyId, deletedAt: null },
      include: { category: true, paidBy: { include: { user: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 8,
    }),
    prisma.savingGoal.findMany({
      where: { familyId, deletedAt: null, status: "ACTIVE" },
      include: { contributions: true },
      take: 5,
    }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Tổng quan tháng này</h1>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Thu nhập" value={summary.income} className="bg-success/5 text-success border-success/20" />
        <Stat label="Chi tiêu" value={summary.expense} className="bg-danger/5 text-danger border-danger/20" />
        <Stat label="Chi cá nhân" value={summary.personalExpense} />
        <Stat label="Chi chung" value={summary.sharedExpense} />
        <div className="col-span-2">
          <Stat label="Số dư" value={summary.balance} className="bg-primary/5 text-primary border-primary/20" />
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-3">Top danh mục chi nhiều nhất</h2>
        {summary.topCategories.length === 0 ? (
          <p className="text-sm text-gray-500">Chưa có giao dịch nào tháng này.</p>
        ) : (
          <ul className="space-y-2">
            {summary.topCategories.map((c) => (
              <li key={c.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: c.color || "#6b7280" }} />
                  {c.name}
                </span>
                <span className="font-medium">{formatVND(c.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Giao dịch gần đây</h2>
          <Link href="/history" className="text-sm text-primary">Xem tất cả →</Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-gray-500">Chưa có giao dịch. <Link href="/add" className="text-primary">Thêm ngay</Link></p>
        ) : (
          <ul className="divide-y">
            {recent.map((t) => (
              <li key={t.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t.category.icon} {t.category.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(t.date)} · {t.paidBy.user.name}
                    {t.note ? ` · ${t.note}` : ""}
                  </p>
                </div>
                <span className={t.type === "INCOME" ? "text-success font-medium" : "text-danger font-medium"}>
                  {t.type === "INCOME" ? "+" : "-"}{formatVND(t.amount.toString())}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {goals.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Mục tiêu đang chạy</h2>
            <Link href="/savings" className="text-sm text-primary">Xem →</Link>
          </div>
          <ul className="space-y-3">
            {goals.map((g) => {
              const total = g.contributions.reduce((s, c) => s + Number(c.amount), 0);
              const target = Number(g.targetAmount);
              const pct = target > 0 ? Math.min(100, (total / target) * 100) : 0;
              return (
                <li key={g.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">🎯 {g.name}</span>
                    <span className="text-gray-500">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{formatVND(total)} / {formatVND(target)}</p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`card border ${className}`}>
      <p className="text-xs opacity-80">{label}</p>
      <p className="text-lg md:text-xl font-bold mt-1">{formatVND(value)}</p>
    </div>
  );
}
