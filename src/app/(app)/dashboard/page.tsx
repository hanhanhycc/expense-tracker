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
      {/* Hero pink card with circular ring */}
      <div className="card-pink relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-primary-700/70 font-semibold">Tháng này</p>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 mt-1">Số dư của bạn</h1>
          </div>
          <span className="chip bg-white text-primary-700 shadow-sm">VND</span>
        </div>

        <div className="mt-6 flex items-center justify-center">
          <BalanceRing income={Number(summary.income)} expense={Number(summary.expense)} />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
          <div className="bg-white/70 rounded-2xl px-4 py-3">
            <p className="text-gray-500 text-xs">Thu nhập</p>
            <p className="font-bold text-success mt-0.5">↑ {formatVND(summary.income)}</p>
          </div>
          <div className="bg-white/70 rounded-2xl px-4 py-3">
            <p className="text-gray-500 text-xs">Chi tiêu</p>
            <p className="font-bold text-danger mt-0.5">↓ {formatVND(summary.expense)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Chi cá nhân" value={summary.personalExpense} icon="👤" />
        <Stat label="Chi chung" value={summary.sharedExpense} icon="👥" />
      </div>

      <div className="card">
        <h2 className="font-bold text-lg mb-3">Top danh mục chi</h2>
        {summary.topCategories.length === 0 ? (
          <p className="text-sm text-gray-500">Chưa có giao dịch nào tháng này.</p>
        ) : (
          <ul className="space-y-3">
            {summary.topCategories.map((c) => (
              <li key={c.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color || "#F783A8" }} />
                  <span className="font-medium">{c.name}</span>
                </span>
                <span className="font-bold text-gray-800">{formatVND(c.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">Chi tiêu gần đây</h2>
          <Link href="/history" className="text-sm text-primary-700 font-semibold">Xem tất cả →</Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-gray-500">Chưa có giao dịch. <Link href="/add" className="text-primary-700 font-semibold">Thêm ngay</Link></p>
        ) : (
          <ul className="space-y-3">
            {recent.map((t) => (
              <li key={t.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-xl shrink-0">
                    {t.category.icon || (t.type === "INCOME" ? "💰" : "💸")}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{t.category.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {formatDate(t.date)} · {t.paidBy.user.name}
                      {t.note ? ` · ${t.note}` : ""}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-bold shrink-0 ${t.type === "INCOME" ? "text-success" : "text-gray-900"}`}>
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
            <h2 className="font-bold text-lg">Mục tiêu đang chạy</h2>
            <Link href="/savings" className="text-sm text-primary-700 font-semibold">Xem →</Link>
          </div>
          <ul className="space-y-4">
            {goals.map((g) => {
              const total = g.contributions.reduce((s, c) => s + Number(c.amount), 0);
              const target = Number(g.targetAmount);
              const pct = target > 0 ? Math.min(100, (total / target) * 100) : 0;
              return (
                <li key={g.id}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-bold">🎯 {g.name}</span>
                    <span className="text-primary-700 font-bold">{pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-2.5 bg-rose-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: "linear-gradient(90deg,#F783A8,#E64980)" }}
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
    <div className="card !p-4">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <p className="text-base font-bold mt-1.5 tracking-tight">{formatVND(value)}</p>
    </div>
  );
}

function BalanceRing({ income, expense }: { income: number; expense: number }) {
  const balance = income - expense;
  const size = 200;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = income + expense;
  const savedPct = total > 0 ? Math.min(100, (income / total) * 100) : 0;
  const dash = (savedPct / 100) * c;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#FFFFFF" strokeOpacity="0.6" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${dash} ${c - dash}`}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F783A8" />
            <stop offset="100%" stopColor="#E64980" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-xs text-gray-500">Số dư</p>
        <p className={`text-2xl font-extrabold tracking-tight ${balance >= 0 ? "text-gray-900" : "text-danger"}`}>
          {formatVND(String(balance))}
        </p>
      </div>
    </div>
  );
}
