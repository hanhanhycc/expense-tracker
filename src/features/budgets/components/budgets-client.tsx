"use client";

import { useEffect, useState } from "react";
import { formatVND } from "@/lib/money";
import { MoneyInput } from "@/components/money-input";
import { useToast } from "@/components/toast";
import { haptic } from "@/lib/haptic";
import { PullToRefresh } from "@/components/pull-to-refresh";

type Item = {
  id: string | null;
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  month: string;
  scope: "PERSONAL" | "SHARED";
  memberId: string | null;
  amount: string;
  spent: string;
  percent: number;
};

type Scope = "PERSONAL" | "SHARED";

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatMonthVN(month: string) {
  const [y, m] = month.split("-").map(Number);
  return `Tháng ${m}/${y}`;
}

export function BudgetsClient({ canManage }: { canManage: boolean }) {
  const [month, setMonth] = useState<string>(currentMonth());
  const [scope, setScope] = useState<Scope>("PERSONAL");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ categoryId: string; amount: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  // Ngân sách chung chỉ ADMIN/OWNER được sửa; ngân sách cá nhân ai cũng sửa được.
  const canEdit = scope === "PERSONAL" ? true : canManage;

  async function load(m: string, s: Scope) {
    setLoading(true);
    const r = await fetch(`/api/budgets?month=${m}&scope=${s}`);
    const d = await r.json();
    setItems(d.items || []);
    setLoading(false);
  }

  useEffect(() => { load(month, scope); }, [month, scope]);

  async function save() {
    if (!editing) return;
    setSaving(true);
    const r = await fetch("/api/budgets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        categoryId: editing.categoryId,
        month,
        amount: Number(editing.amount || "0"),
        scope,
      }),
    });
    setSaving(false);
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      toast.error(d.error || "Lỗi");
      return;
    }
    haptic("light");
    toast.success("Đã lưu ngân sách");
    setEditing(null);
    load(month, scope);
  }

  const totalBudget = items.reduce((s, i) => s + Number(i.amount), 0);
  const totalSpent = items.reduce((s, i) => s + Number(i.spent), 0);
  const totalPercent = totalBudget > 0 ? Math.min(999, (totalSpent / totalBudget) * 100) : 0;

  return (
    <PullToRefresh onRefresh={() => load(month, scope)}>
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Ngân sách</h1>
      </div>

      {/* Tabs cá nhân / chung */}
      <div className="flex gap-1 p-1 bg-rose-50 rounded-full">
        <button
          onClick={() => setScope("PERSONAL")}
          className={`flex-1 py-2 text-sm font-bold rounded-full transition ${scope === "PERSONAL" ? "bg-white text-primary-700 shadow-sm" : "text-gray-500"}`}
        >✍️ Của tôi</button>
        <button
          onClick={() => setScope("SHARED")}
          className={`flex-1 py-2 text-sm font-bold rounded-full transition ${scope === "SHARED" ? "bg-white text-primary-700 shadow-sm" : "text-gray-500"}`}
        >👪 Chung</button>
      </div>

      <div className="card flex items-center justify-between gap-3">
        <button
          onClick={() => setMonth(shiftMonth(month, -1))}
          className="w-10 h-10 rounded-full bg-rose-50 hover:bg-rose-100 text-primary-700 font-bold"
          aria-label="Tháng trước"
        >‹</button>
        <div className="text-center">
          <p className="text-xs text-gray-500">{formatMonthVN(month)}</p>
          <p className="text-lg font-extrabold">{formatVND(totalSpent)} <span className="text-gray-400 font-medium">/ {formatVND(totalBudget)}</span></p>
          {totalBudget > 0 && (
            <p className={`text-xs font-semibold mt-0.5 ${totalPercent > 100 ? "text-danger" : "text-gray-600"}`}>
              {totalPercent.toFixed(0)}% đã chi
            </p>
          )}
        </div>
        <button
          onClick={() => setMonth(shiftMonth(month, 1))}
          className="w-10 h-10 rounded-full bg-rose-50 hover:bg-rose-100 text-primary-700 font-bold"
          aria-label="Tháng sau"
        >›</button>
      </div>

      <div className="card !p-0">
        {loading ? (
          <ul className="divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 skeleton-shimmer" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 rounded bg-rose-100 skeleton-shimmer" />
                  <div className="h-2 w-full rounded bg-rose-100 skeleton-shimmer" />
                </div>
              </li>
            ))}
          </ul>
        ) : items.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-500">Chưa có danh mục chi tiêu nào.</p>
        ) : (
          <ul className="divide-y">
            {items.map((b) => {
              const over = b.percent > 100;
              const hasBudget = Number(b.amount) > 0;
              return (
                <li key={b.categoryId} className="p-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                      style={{ background: (b.categoryColor || "#F783A8") + "22" }}
                    >
                      {b.categoryIcon || "📦"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline gap-2">
                        <p className="text-sm font-semibold truncate">{b.categoryName}</p>
                        <p className={`text-xs font-bold tabular-nums whitespace-nowrap ${over ? "text-danger" : "text-gray-700"}`}>
                          {formatVND(b.spent)}
                          {hasBudget && <span className="text-gray-400 font-medium"> / {formatVND(b.amount)}</span>}
                        </p>
                      </div>
                      {hasBudget ? (
                        <div className="mt-1.5 h-2 bg-rose-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, b.percent)}%`,
                              background: over
                                ? "linear-gradient(90deg,#FCA5A5,#DC2626)"
                                : b.percent > 80
                                  ? "linear-gradient(90deg,#FBBF24,#F59E0B)"
                                  : "linear-gradient(90deg,#F783A8,#E64980)",
                            }}
                          />
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 mt-0.5">Chưa đặt ngân sách</p>
                      )}
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => setEditing({ categoryId: b.categoryId, amount: Number(b.amount) > 0 ? b.amount : "" })}
                        className="text-xs text-primary-700 font-bold shrink-0 px-2 py-1 rounded-full hover:bg-rose-50"
                      >
                        {hasBudget ? "Sửa" : "Đặt"}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {editing && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4"
          onClick={() => !saving && setEditing(null)}
        >
          <div className="bg-white rounded-3xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-1">
              Ngân sách: {items.find((i) => i.categoryId === editing.categoryId)?.categoryName}
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              {scope === "PERSONAL" ? "Của tôi · " : "Chung · "}{formatMonthVN(month)}
            </p>
            <MoneyInput
              className="input"
              value={editing.amount}
              onValueChange={(v) => setEditing({ ...editing, amount: v })}
              placeholder="0"
              autoFocus
            />
            <p className="text-[11px] text-gray-400 mt-2">Nhập 0 để xoá ngân sách.</p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setEditing(null)}
                disabled={saving}
                className="btn-ghost flex-1"
              >Huỷ</button>
              <button
                onClick={save}
                disabled={saving}
                className="btn-primary flex-1"
              >{saving ? "Đang lưu..." : "Lưu"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}
