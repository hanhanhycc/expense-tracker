"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { formatVND } from "@/lib/money";

type Range = "30d" | "3m" | "6m" | "12m" | "ytd";

type Report = {
  range: Range;
  from: string;
  to: string;
  totals: { income: number; expense: number; balance: number; personalExpense: number; sharedExpense: number };
  deltas: { income: number; expense: number };
  series: { label: string; income: number; expense: number }[];
  byCategory: { name: string; color: string | null; icon: string | null; total: number }[];
  byMember: { name: string; total: number }[];
};

const PALETTE = ["#F783A8", "#E64980", "#FFA94D", "#FFD43B", "#69DB7C", "#4DABF7", "#9775FA", "#F06595", "#FF8787", "#3BC9DB"];
const RANGES: { key: Range; label: string }[] = [
  { key: "30d", label: "30 ngày" },
  { key: "3m", label: "3 tháng" },
  { key: "6m", label: "6 tháng" },
  { key: "12m", label: "12 tháng" },
  { key: "ytd", label: "Từ đầu năm" },
];

export function ReportsClient() {
  const [range, setRange] = useState<Range>("6m");
  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports?range=${range}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, [range]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">Báo cáo</h1>
      </div>

      <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition ${
              range === r.key
                ? "bg-primary text-white border-primary shadow-[0_8px_24px_rgba(247,131,168,0.35)]"
                : "bg-white text-gray-700 border-rose-100 hover:bg-rose-50"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {loading || !data ? (
        <SkeletonCards />
      ) : (
        <ReportContent data={data} />
      )}
    </div>
  );
}

function SkeletonCards() {
  return (
    <div className="space-y-4">
      <div className="card h-40 animate-pulse bg-rose-50/50" />
      <div className="card h-72 animate-pulse bg-rose-50/50" />
      <div className="card h-72 animate-pulse bg-rose-50/50" />
    </div>
  );
}

function ReportContent({ data }: { data: Report }) {
  const { totals, deltas, series, byCategory, byMember } = data;

  const totalCat = useMemo(() => byCategory.reduce((s, c) => s + c.total, 0), [byCategory]);
  // Top 5 + Khác (cho pie)
  const pieData = useMemo(() => {
    if (byCategory.length <= 6) return byCategory;
    const top = byCategory.slice(0, 5);
    const other = byCategory.slice(5).reduce((s, c) => s + c.total, 0);
    return [...top, { name: "Khác", color: "#CED4DA", icon: "📦", total: other }];
  }, [byCategory]);

  return (
    <div className="space-y-4">
      {/* Hero KPI */}
      <div
        className="rounded-3xl p-5 border border-rose-200 shadow-[0_12px_40px_rgba(231,72,128,0.18)] text-white"
        style={{ background: "linear-gradient(135deg,#F783A8 0%,#E64980 100%)" }}
      >
        <p className="text-xs uppercase tracking-wider opacity-90">Số dư trong kỳ</p>
        <p className="text-3xl font-extrabold mt-1">{formatVND(totals.balance)}</p>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <KpiBox label="Thu" value={totals.income} delta={deltas.income} positiveIsGood />
          <KpiBox label="Chi" value={totals.expense} delta={deltas.expense} positiveIsGood={false} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MiniStat label="Chi cá nhân" value={totals.personalExpense} accent="bg-rose-100 text-primary-700" />
        <MiniStat label="Chi chung" value={totals.sharedExpense} accent="bg-amber-100 text-amber-700" />
      </div>

      {/* Series chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Thu vs Chi</h2>
          <div className="flex items-center gap-3 text-xs">
            <LegendDot color="#69DB7C" label="Thu" />
            <LegendDot color="#E64980" label="Chi" />
          </div>
        </div>
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={series} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="barIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#69DB7C" />
                  <stop offset="100%" stopColor="#37B24D" />
                </linearGradient>
                <linearGradient id="barExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F783A8" />
                  <stop offset="100%" stopColor="#E64980" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#FFE4EC" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#868E96" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v: number) => abbreviate(v)} tick={{ fontSize: 11, fill: "#868E96" }} axisLine={false} tickLine={false} width={48} />
              <Tooltip
                cursor={{ fill: "rgba(247,131,168,0.08)" }}
                contentStyle={{ border: "none", borderRadius: 12, boxShadow: "0 8px 24px rgba(231,72,128,0.18)" }}
                formatter={(v: number, name) => [formatVND(v), name === "income" ? "Thu" : "Chi"]}
              />
              <Bar dataKey="income" fill="url(#barIncome)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expense" fill="url(#barExpense)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* By category */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Chi theo danh mục</h2>
          <span className="text-xs text-gray-500">{byCategory.length} mục</span>
        </div>
        {byCategory.length === 0 ? (
          <EmptyState text="Chưa có khoản chi nào trong kỳ." />
        ) : (
          <div className="grid md:grid-cols-2 gap-4 items-center">
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="total" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={92} paddingAngle={2} stroke="none">
                    {pieData.map((c, i) => (
                      <Cell key={i} fill={c.color || PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ border: "none", borderRadius: 12, boxShadow: "0 8px 24px rgba(231,72,128,0.18)" }}
                    formatter={(v: number) => formatVND(v)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-2">
              {byCategory.slice(0, 6).map((c, i) => {
                const pct = totalCat > 0 ? (c.total / totalCat) * 100 : 0;
                const color = c.color || PALETTE[i % PALETTE.length];
                return (
                  <li key={c.name}>
                    <div className="flex items-center gap-2 text-sm mb-1">
                      <span className="w-7 h-7 rounded-full flex items-center justify-center text-base shrink-0" style={{ background: color + "22" }}>{c.icon || "📦"}</span>
                      <span className="flex-1 truncate font-medium">{c.name}</span>
                      <span className="text-xs text-gray-500">{pct.toFixed(1)}%</span>
                      <span className="font-semibold tabular-nums">{formatVND(c.total)}</span>
                    </div>
                    <div className="h-1.5 bg-rose-50 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* By member */}
      <div className="card">
        <h2 className="text-lg font-bold mb-3">Chi theo thành viên</h2>
        {byMember.length === 0 ? (
          <EmptyState text="Chưa có dữ liệu." />
        ) : (
          <ul className="space-y-3">
            {byMember.map((m, i) => {
              const max = Math.max(...byMember.map((x) => x.total));
              const pct = max > 0 ? (m.total / max) * 100 : 0;
              const color = PALETTE[i % PALETTE.length];
              return (
                <li key={m.name}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: color }}
                      >
                        {m.name.trim().charAt(0).toUpperCase()}
                      </span>
                      <span className="font-medium truncate">{m.name}</span>
                    </div>
                    <span className="font-bold tabular-nums">{formatVND(m.total)}</span>
                  </div>
                  <div className="h-2 bg-rose-50 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}AA)` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function KpiBox({ label, value, delta, positiveIsGood }: { label: string; value: number; delta: number; positiveIsGood: boolean }) {
  const up = delta >= 0;
  const good = positiveIsGood ? up : !up;
  const sign = up ? "+" : "";
  return (
    <div className="rounded-2xl bg-white/15 backdrop-blur p-3">
      <p className="text-[11px] uppercase tracking-wider opacity-90">{label}</p>
      <p className="text-lg font-extrabold mt-0.5">{formatVND(value)}</p>
      <p className={`text-xs mt-0.5 ${good ? "text-green-100" : "text-rose-100"}`}>
        {up ? "▲" : "▼"} {sign}{delta.toFixed(1)}% so với kỳ trước
      </p>
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="card !p-4">
      <p className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${accent}`}>{label}</p>
      <p className="text-lg font-extrabold mt-2 tabular-nums">{formatVND(value)}</p>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-gray-700">
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-8 text-sm text-gray-500">
      <div className="text-3xl mb-1">📊</div>
      {text}
    </div>
  );
}

function abbreviate(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + "tr";
  if (abs >= 1_000) return (n / 1_000).toFixed(0) + "k";
  return String(n);
}

