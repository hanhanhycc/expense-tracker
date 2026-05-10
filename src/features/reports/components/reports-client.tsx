"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatVND } from "@/lib/money";

type Report = {
  monthly: { month: string; income: number; expense: number }[];
  byCategory: { name: string; color: string | null; total: number }[];
  byMember: { name: string; total: number }[];
  sharedExpenseTotal: number;
};

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#ec4899", "#8b5cf6", "#0ea5e9", "#f43f5e", "#14b8a6", "#6366f1", "#84cc16"];

export function ReportsClient() {
  const [data, setData] = useState<Report | null>(null);

  useEffect(() => {
    fetch("/api/reports").then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <p className="text-sm text-gray-500">Đang tải...</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Báo cáo</h1>

      <div className="card">
        <h2 className="font-semibold mb-3">Thu vs Chi (12 tháng)</h2>
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={data.monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => (v / 1_000_000).toFixed(0) + "tr"} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatVND(v)} />
              <Legend />
              <Bar dataKey="income" fill="#16a34a" name="Thu" />
              <Bar dataKey="expense" fill="#dc2626" name="Chi" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-3">Chi theo danh mục</h2>
        {data.byCategory.length === 0 ? (
          <p className="text-sm text-gray-500">Chưa có dữ liệu.</p>
        ) : (
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data.byCategory} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(e) => e.name}>
                  {data.byCategory.map((c, i) => (
                    <Cell key={i} fill={c.color || COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatVND(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="font-semibold mb-3">Chi theo thành viên</h2>
        {data.byMember.length === 0 ? (
          <p className="text-sm text-gray-500">Chưa có dữ liệu.</p>
        ) : (
          <ul className="space-y-2">
            {data.byMember.map((m, i) => {
              const max = Math.max(...data.byMember.map((x) => x.total));
              const pct = max > 0 ? (m.total / max) * 100 : 0;
              return (
                <li key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{m.name}</span>
                    <span className="font-medium">{formatVND(m.total)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="card">
        <h2 className="font-semibold mb-1">Tổng chi chung của gia đình</h2>
        <p className="text-2xl font-bold text-primary">{formatVND(data.sharedExpenseTotal)}</p>
        <p className="text-xs text-gray-500 mt-1">Tổng các khoản chi được đánh dấu &quot;Chia sẻ&quot;.</p>
      </div>
    </div>
  );
}
