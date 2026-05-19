import { requireAuth } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { monthSummary } from "@/features/transactions/server/service";
import { topPersonalBudgets } from "@/features/budgets/server/service";
import { endOfMonth, startOfMonth, formatDate } from "@/lib/date";
import { formatVND } from "@/lib/money";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireAuth();
  const familyId = session.user.familyId;
  const from = startOfMonth();
  const to = endOfMonth();
  const monthStr = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}`;
  const monthLabel = `Tháng ${from.getMonth() + 1}, ${from.getFullYear()}`;

  const [summary, recent, goals, budgets] = await Promise.all([
    monthSummary(familyId, session.user.memberId, from, to),
    prisma.transaction.findMany({
      where: {
        familyId,
        deletedAt: null,
        OR: [
          { createdById: session.user.memberId },
          { paidById: session.user.memberId },
          { shares: { some: { memberId: session.user.memberId } } },
        ],
      },
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
    topPersonalBudgets(familyId, session.user.memberId, monthStr, 4),
  ]);

  const balance = Number(summary.income) - Number(summary.expense);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Hero balance card — spatial glass with depth glow */}
      <div className="card-pink">
        <div className="flex items-center justify-between mb-3">
          <span className="chip">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="mr-1.5">
              <rect x="3" y="4" width="18" height="18" rx="3" />
              <path d="M3 10h18M8 2v4M16 2v4" />
            </svg>
            {monthLabel}
          </span>
          <span className="chip chip-accent">● VND</span>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-3">Số dư khả dụng</p>
          <p className="num mt-1.5 font-extrabold leading-none text-ink-1" style={{ fontSize: "clamp(32px, 9vw, 44px)", letterSpacing: "-0.035em" }}>
            {formatVND(String(balance))}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mt-4">
          <StatGlass kind="income" label="Thu nhập" value={summary.income} />
          <StatGlass kind="expense" label="Chi tiêu" value={summary.expense} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Chi cá nhân" value={summary.personalExpense} icon="👤" />
        <Stat label="Chi chung" value={summary.sharedExpense} icon="👥" />
      </div>

      {budgets.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="section-title">Ngân sách tháng này</h2>
            <Link href="/budgets" className="section-link">Xem →</Link>
          </div>
          <div className="card">
            <ul className="space-y-3.5">
              {budgets.map((b) => {
                const over = b.percent > 100;
                const warn = !over && b.percent > 80;
                const fillGradient = over
                  ? "linear-gradient(90deg,#FF7088,#FF2D55)"
                  : warn
                    ? "linear-gradient(90deg,#FFC97A,#FF8A4D)"
                    : "linear-gradient(90deg, var(--accent-2), var(--accent-1))";
                return (
                  <li key={b.categoryId}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-bold inline-flex items-center gap-2 text-ink-1">
                        <span
                          className="w-7 h-7 rounded-xl grid place-items-center text-sm"
                          style={{ background: "var(--glass-bg-strong)", border: "1px solid var(--glass-border)" }}
                        >
                          {b.categoryIcon || "📦"}
                        </span>
                        {b.categoryName}
                      </span>
                      <span className={`font-extrabold num ${over ? "text-danger-ink" : "text-ink-2"}`}>
                        {b.percent.toFixed(0)}%
                      </span>
                    </div>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: `${Math.min(100, b.percent)}%`, background: fillGradient }}
                      />
                    </div>
                    <p className="text-[11px] text-ink-3 mt-1 num">
                      {formatVND(b.spent)} / {formatVND(b.amount)}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="section-title">Top danh mục chi</h2>
        </div>
        <div className="card">
          {summary.topCategories.length === 0 ? (
            <p className="text-sm text-ink-3">Chưa có giao dịch nào tháng này.</p>
          ) : (
            <ul className="space-y-3">
              {summary.topCategories.map((c) => (
                <li key={c.id} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: c.color || "var(--accent-1)", boxShadow: `0 0 12px ${c.color || "var(--accent-1)"}` }}
                    />
                    <span className="font-semibold text-ink-1">{c.name}</span>
                  </span>
                  <span className="font-extrabold text-ink-1 num">{formatVND(c.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="section-title">Chi tiêu gần đây</h2>
          <Link href="/history" className="section-link">Xem tất cả →</Link>
        </div>
        <div className="card">
          {recent.length === 0 ? (
            <p className="text-sm text-ink-3">
              Chưa có giao dịch. <Link href="/add" className="text-accent font-semibold">Thêm ngay</Link>
            </p>
          ) : (
            <ul className="space-y-1">
              {recent.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-2.5 px-1">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0"
                      style={{
                        background: "var(--glass-bg-strong)",
                        border: "1px solid var(--glass-border)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
                      }}
                    >
                      {t.category.icon || (t.type === "INCOME" ? "💰" : "💸")}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate text-ink-1">{t.category.name}</p>
                      <p className="text-xs text-ink-3 truncate">
                        {formatDate(t.date)} · {t.paidBy.user.name}
                        {t.note ? ` · ${t.note}` : ""}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-extrabold shrink-0 num ${t.type === "INCOME" ? "text-success-ink" : "text-ink-1"}`}>
                    {t.type === "INCOME" ? "+" : "−"}{formatVND(t.amount.toString())}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {goals.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="section-title">Mục tiêu đang chạy</h2>
            <Link href="/savings" className="section-link">Xem →</Link>
          </div>
          <div className="card space-y-4">
            {goals.map((g) => {
              const total = g.contributions.reduce((s, c) => s + Number(c.amount), 0);
              const target = Number(g.targetAmount);
              const pct = target > 0 ? Math.min(100, (total / target) * 100) : 0;
              return (
                <div key={g.id}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-bold text-ink-1 inline-flex items-center gap-2">
                      <span
                        className="w-8 h-8 rounded-xl grid place-items-center text-base text-white"
                        style={{
                          background: "linear-gradient(135deg, var(--accent-2), var(--accent-1))",
                          boxShadow: "0 6px 16px -4px var(--accent-1)",
                        }}
                      >
                        🎯
                      </span>
                      {g.name}
                    </span>
                    <span className="text-accent font-extrabold num">{pct.toFixed(0)}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-ink-3 mt-1.5 num">{formatVND(total)} / {formatVND(target)}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="card !p-4">
      <div className="flex items-center gap-2 text-xs text-ink-3">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <p className="text-base font-extrabold mt-1.5 num text-ink-1">{formatVND(value)}</p>
    </div>
  );
}

function StatGlass({ kind, label, value }: { kind: "income" | "expense"; label: string; value: string }) {
  const isIncome = kind === "income";
  return (
    <div
      className="flex items-center gap-3 rounded-2xl px-3.5 py-3"
      style={{
        background: "var(--glass-bg-strong)",
        backdropFilter: "blur(28px) saturate(180%)",
        WebkitBackdropFilter: "blur(28px) saturate(180%)",
        border: "1px solid var(--glass-border)",
      }}
    >
      <div
        className="w-9 h-9 rounded-xl grid place-items-center text-base shrink-0 font-bold"
        style={{
          background: isIncome ? "color-mix(in srgb, var(--success) 18%, transparent)" : "color-mix(in srgb, var(--danger) 18%, transparent)",
          color: isIncome ? "var(--success)" : "var(--danger)",
        }}
      >
        {isIncome ? "↗" : "↘"}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-ink-3">{label}</p>
        <p className="text-[15px] font-extrabold text-ink-1 num leading-tight">{formatVND(value)}</p>
      </div>
    </div>
  );
}
