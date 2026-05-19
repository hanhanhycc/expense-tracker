"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatVND } from "@/lib/money";
import { formatDate } from "@/lib/date";
import { TransactionForm, type TransactionFormInitial } from "@/features/transactions/components/transaction-form";
import { useToast } from "@/components/toast";
import { SkeletonList } from "@/components/skeleton";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { haptic } from "@/lib/haptic";
import { SwipeActions } from "@/components/swipe-actions";

type Tx = {
  id: string;
  amount: string;
  type: "INCOME" | "EXPENSE";
  date: string;
  note: string | null;
  visibility: "PERSONAL" | "SHARED";
  splitType: "NONE" | "EQUAL" | "CUSTOM";
  paidById: string;
  createdById: string;
  categoryId: string;
  accountId: string | null;
  receiptPath: string | null;
  category: { name: string; icon: string | null; color: string | null };
  account: { id: string; name: string; icon: string | null } | null;
  paidBy: { id: string; user: { name: string } };
  shares: { memberId: string; amount: string; member: { user: { name: string } } }[];
};
type Cat = { id: string; name: string; kind: "INCOME" | "EXPENSE" };
type Member = { id: string; user: { name: string } };
type Acc = { id: string; name: string; icon: string | null };

export function HistoryClient({ currentMemberId }: { currentMemberId: string }) {
  const [items, setItems] = useState<Tx[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [accs, setAccs] = useState<Acc[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [editing, setEditing] = useState<Tx | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<Tx | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const toast = useToast();

  const initialFilter = { from: "", to: "", categoryId: "", accountId: "", memberId: "", visibility: "ALL", q: "" };
  const [filter, setFilter] = useState(initialFilter);
  const [applied, setApplied] = useState(initialFilter);

  const PAGE_SIZE = 50;

  async function load(reset = true, nextPage = 1) {
    if (reset) setLoading(true); else setLoadingMore(true);
    const params = new URLSearchParams();
    Object.entries(applied).forEach(([k, v]) => { if (v) params.set(k, v); });
    params.set("page", String(nextPage));
    params.set("limit", String(PAGE_SIZE));
    const res = await fetch("/api/transactions?" + params.toString());
    const data = await res.json();
    const newItems: Tx[] = data.items || [];
    setItems((prev) => reset ? newItems : [...prev, ...newItems]);
    setHasMore(!!data.hasMore);
    setTotal(data.total ?? newItems.length);
    setPage(nextPage);
    if (reset) setLoading(false); else setLoadingMore(false);
  }

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then((d) => setCats(d.items || []));
    fetch("/api/members").then((r) => r.json()).then((d) => setMembers(d.items || []));
    fetch("/api/accounts").then((r) => r.json()).then((d) => setAccs(d.items || []));
  }, []);

  useEffect(() => { load(true, 1); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [applied]);

  // Deep-link: ?txId=xxx → highlight + scroll tới giao dịch đó.
  useEffect(() => {
    const txId = searchParams?.get("txId");
    if (!txId || loading) return;
    const found = items.find((t) => t.id === txId);
    if (!found) return;
    setHighlightId(txId);
    // Defer để DOM render xong.
    requestAnimationFrame(() => {
      document.getElementById(`tx-${txId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    const timer = setTimeout(() => setHighlightId(null), 3000);
    return () => clearTimeout(timer);
  }, [searchParams, items, loading]);

  async function onDelete(id: string) {
    if (!confirm("Xoá giao dịch này?")) return;
    const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || "Xoá thất bại");
      return;
    }
    haptic("medium");
    toast.success("Đã xoá giao dịch");
    load(true, 1);
  }

  function exportUrl() {
    const params = new URLSearchParams();
    Object.entries(applied).forEach(([k, v]) => { if (v) params.set(k, v); });
    return "/api/export/transactions?" + params.toString();
  }

  if (editing) {
    const initial: TransactionFormInitial = {
      id: editing.id,
      type: editing.type,
      amount: editing.amount,
      categoryId: editing.categoryId,
      accountId: editing.accountId,
      note: editing.note ?? "",
      date: editing.date.slice(0, 10),
      paidById: editing.paidById,
      visibility: editing.visibility,
      splitType: editing.splitType,
      sharedMemberIds: editing.shares.map((s) => s.memberId),
      customShares: editing.shares.map((s) => ({ memberId: s.memberId, amount: Number(s.amount) })),
      hasReceipt: !!editing.receiptPath,
    };
    return (
      <div className="max-w-md mx-auto">
        <button onClick={() => setEditing(null)} className="text-sm text-primary mb-3">← Quay lại</button>
        <h1 className="text-xl font-bold mb-4">Sửa giao dịch</h1>
        <TransactionForm initial={initial} currentMemberId={currentMemberId} />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={() => load(true, 1)}>
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-2xl font-extrabold tracking-tight">Lịch sử giao dịch</h1>
        <a href={exportUrl()} className="btn-ghost text-sm">📤 Export</a>
      </div>

      <form
        className="card grid grid-cols-2 md:grid-cols-3 gap-3"
        onSubmit={(e) => { e.preventDefault(); setApplied(filter); }}
      >
        <div className="col-span-2 md:col-span-3 flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
          {(() => {
            const today = new Date();
            const fmt = (d: Date) => d.toISOString().slice(0, 10);
            const startOfWeek = new Date(today);
            const day = (today.getDay() + 6) % 7; // Mon=0
            startOfWeek.setDate(today.getDate() - day);
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const start3m = new Date(today.getFullYear(), today.getMonth() - 2, 1);
            const startYear = new Date(today.getFullYear(), 0, 1);
            const presets: { label: string; from: string; to: string }[] = [
              { label: "Tuần này", from: fmt(startOfWeek), to: fmt(today) },
              { label: "Tháng này", from: fmt(startOfMonth), to: fmt(today) },
              { label: "3 tháng", from: fmt(start3m), to: fmt(today) },
              { label: "Từ đầu năm", from: fmt(startYear), to: fmt(today) },
              { label: "Tất cả", from: "", to: "" },
            ];
            const apply = (p: { from: string; to: string }) => {
              const next = { ...filter, from: p.from, to: p.to };
              setFilter(next);
              setApplied(next);
            };
            return presets.map((p) => {
              const active = filter.from === p.from && filter.to === p.to;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => apply(p)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                    active ? "chip-accent" : "chip"
                  }`}
                >
                  {p.label}
                </button>
              );
            });
          })()}
        </div>

        <div>
          <label className="label">Từ ngày</label>
          <input type="date" className="input" value={filter.from} onChange={(e) => setFilter({ ...filter, from: e.target.value })} />
        </div>
        <div>
          <label className="label">Đến ngày</label>
          <input type="date" className="input" value={filter.to} onChange={(e) => setFilter({ ...filter, to: e.target.value })} />
        </div>
        <div>
          <label className="label">Danh mục</label>
          <select className="input" value={filter.categoryId} onChange={(e) => setFilter({ ...filter, categoryId: e.target.value })}>
            <option value="">Tất cả</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Thành viên</label>
          <select className="input" value={filter.memberId} onChange={(e) => setFilter({ ...filter, memberId: e.target.value })}>
            <option value="">Tất cả</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.user.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Tài khoản</label>
          <select className="input" value={filter.accountId} onChange={(e) => setFilter({ ...filter, accountId: e.target.value })}>
            <option value="">Tất cả</option>
            {accs.map((a) => <option key={a.id} value={a.id}>{a.icon ? `${a.icon} ` : ""}{a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Loại</label>
          <select className="input" value={filter.visibility} onChange={(e) => setFilter({ ...filter, visibility: e.target.value })}>
            <option value="ALL">Tất cả</option>
            <option value="PERSONAL">Cá nhân</option>
            <option value="SHARED">Chung</option>
          </select>
        </div>
        <div>
          <label className="label">Tìm ghi chú</label>
          <input className="input" value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })} placeholder="..." />
        </div>
        <div className="col-span-2 md:col-span-3 flex gap-2 justify-end pt-1">
          <button
            type="button"
            className="btn-ghost text-sm"
            onClick={() => { setFilter(initialFilter); setApplied(initialFilter); }}
          >
            Đặt lại
          </button>
          <button type="submit" className="btn-primary text-sm">🔍 Tìm kiếm</button>
        </div>
      </form>

      <div className="card !p-0">
        {loading ? (
          <SkeletonList rows={6} />
        ) : items.length === 0 ? (
          <p className="p-6 text-center text-gray-500 text-sm">Không có giao dịch nào.</p>
        ) : (
          <ul className="divide-y">
            {items.map((t) => {
              const isOwner = t.createdById === currentMemberId;
              const row = (
                <div className="p-3 flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-lg shrink-0"
                    style={{
                      background: (t.category.color || "#6b7280") + "22",
                      border: "1px solid var(--glass-border)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18)",
                    }}
                  >
                    {t.category.icon || "📦"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {t.category.name}
                      {t.visibility === "SHARED" && <span className="ml-2 chip bg-primary/10 text-primary">Chung</span>}
                      {t.receiptPath && (
                        <button
                          type="button"
                          onClick={() => setViewingReceipt(t)}
                          className="ml-2 chip bg-rose-50 text-primary border border-rose-100 hover:bg-rose-100"
                          title="Xem ảnh bill"
                        >📷</button>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {formatDate(t.date)} · {t.paidBy.user.name}
                      {t.account ? ` · ${t.account.icon ? `${t.account.icon} ` : ""}${t.account.name}` : ""}
                      {t.note ? ` · ${t.note}` : ""}
                    </p>
                    {t.shares.length > 0 && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {t.shares.map((s) => `${s.member.user.name}: ${formatVND(s.amount)}`).join(" • ")}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`num font-extrabold ${t.type === "INCOME" ? "text-success-ink" : "text-ink-1"}`}>
                      {t.type === "INCOME" ? "+" : "−"}{formatVND(t.amount)}
                    </p>
                    {!isOwner && (
                      <p className="text-[11px] text-gray-400 mt-0.5">Của {t.paidBy.user.name}</p>
                    )}
                    {isOwner && (
                      <p className="text-[11px] text-gray-300 mt-0.5 hidden md:block">← Vuốt để sửa/xoá</p>
                    )}
                  </div>
                </div>
              );
              const highlight = highlightId === t.id;
              return (
                <li
                  key={t.id}
                  id={`tx-${t.id}`}
                  className={highlight ? "bg-rose-50 ring-2 ring-primary/50 transition" : "transition"}
                >
                  {isOwner ? (
                    <SwipeActions
                      rightActions={[
                        { label: "Sửa", icon: "✏️", color: "primary", onClick: () => { haptic("selection"); setEditing(t); } },
                        { label: "Xoá", icon: "🗑", color: "danger", onClick: () => onDelete(t.id) },
                      ]}
                    >
                      {row}
                    </SwipeActions>
                  ) : (
                    row
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {!loading && hasMore && (
          <div className="p-3 border-t flex items-center justify-center">
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => load(false, page + 1)}
              className="btn-ghost text-sm"
            >
              {loadingMore ? "Đang tải..." : `Xem thêm (còn ${total - items.length})`}
            </button>
          </div>
        )}
        {!loading && items.length > 0 && (
          <div className="px-3 pb-3 text-center text-[11px] text-gray-400">
            Hiển thị {items.length}/{total} giao dịch
          </div>
        )}
      </div>

      {viewingReceipt && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setViewingReceipt(null)}
        >
          <div className="relative max-w-3xl max-h-full" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/transactions/${viewingReceipt.id}/receipt`}
              alt="bill"
              className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setViewingReceipt(null)}
              className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-white text-gray-800 shadow-lg"
              aria-label="Đóng"
            >✕</button>
          </div>
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}
