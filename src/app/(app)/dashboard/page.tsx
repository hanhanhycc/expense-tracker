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
      where: {
        familyId,
        deletedAt: null,
        status: "ACTIVE",
        OR: [
          { visibility: "SHARED" },
          { visibility: "PERSONAL", createdById: session.user.memberId },
        ],
      },
      include: { contributions: true },
      take: 5,
    }),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-wider text-gray-500">Tháng này</p>
        <h1 className="text-2xl font-bold tracking-tight">Tổng quan tài chính</h1>
      </div>

      {/* Hero balance */}
      <div className="card !p-6 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary/30 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-blue-300/30 blur-3xl pointer-events-none" />
        <div className="relative">
          <p className="text-xs uppercase tracking-wider text-gray-500">Số dư</p>
          <p className={`text-4xl font-bold tracking-tight mt-1 ${Number(summary.balance) >= 0 ? "text-gray-900" : "text-danger"}`}>
            {formatVND(summary.balance)}
          </p>
          <div className="grid grid-cols-2 gap-3 mt-5">
            <MiniStat label="Thu nhập" value={summary.income} variant="income" />
            <MiniStat label="Chi tiêu" value={summary.expense} variant="expense" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Chi cá nhân" value={summary.personalExpense} icon="👤" />
        <Stat label="Chi chung" value={summary.sharedExpense} icon="👥" />
      </div>

      <div className="card">
        <h2 className="font-semibold mb-3">Top danh mục chi nhiều nhất</h2>
        {summary.topCategories.length === 0 ? (
          <p className="text-sm text-gray-500">Chưa có giao dịch nào tháng này.</p>
        ) : (
          <ul className="space-y-2.5">
            {summary.topCategories.map((c) => (
              <li key={c.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color || "#6b7280" }} />
                  <span className="font-medium">{c.name}</span>
                </span>
                <span className="font-semibold text-gray-700">{formatVND(c.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Giao dịch gần đây</h2>
          <Link href="/history" className="text-sm text-primary font-medium">Xem tất cả →</Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-gray-500">Chưa có giao dịch. <Link href="/add" className="text-primary">Thêm ngay</Link></p>
        ) : (
          <ul className="divide-y divide-gray-100/60">
            {recent.map((t) => (
              <li key={t.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white/60 backdrop-blur flex items-center justify-center text-lg shrink-0 border border-white/50">
                    {t.category.icon || (t.type === "INCOME" ? "💰" : "💸")}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{t.category.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {formatDate(t.date)} · {t.paidBy.user.name}
                      {t.note ? ` · ${t.note}` : ""}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-semibold shrink-0 ${t.type === "INCOME" ? "text-success" : "text-danger"}`}>
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
            <Link href="/savings" className="text-sm text-primary font-medium">Xem →</Link>
          </div>
          <ul className="space-y-4">
            {goals.map((g) => {
              const total = g.contributions.reduce((s, c) => s + Number(c.amount), 0);
              const target = Number(g.targetAmount);
              const pct = target > 0 ? Math.min(100, (total / target) * 100) : 0;
              return (
                <li key={g.id}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium">🎯 {g.name}</span>
                    <span className="text-gray-500 font-medium">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-2.5 bg-white/40 rounded-full overflow-hidden border border-white/40">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: "linear-gradient(90deg, #FF8E8E, #EF5A5A)",
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">{formatVND(total)} / {formatVND(target)}</p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <p className="text-lg font-bold mt-1.5 tracking-tight">{formatVND(value)}</p>
    </div>
  );
}

function MiniStat({ label, value, variant }: { label: string; value: string; variant: "income" | "expense" }) {
  const color = variant === "income" ? "text-success" : "text-danger";
  const arrow = variant === "income" ? "↑" : "↓";
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-base font-bold mt-0.5 ${color}`}>
        {arrow} {formatVND(value)}
      </p>
    </div>
  );
}
