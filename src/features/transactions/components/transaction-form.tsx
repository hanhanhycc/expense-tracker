"use client";

import { useEffect, useState } from "react";
import { parseMoneyInput } from "@/lib/money";
import { MoneyInput } from "@/components/money-input";
import { useToast } from "@/components/toast";
import { fireConfetti } from "@/components/confetti";

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function waitMs(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type Category = { id: string; name: string; kind: "INCOME" | "EXPENSE"; icon: string | null; color: string | null };
type Member = { id: string; user: { id: string; name: string }; role: string };

export type TransactionFormInitial = {
  id?: string;
  type?: "INCOME" | "EXPENSE";
  amount?: string;
  categoryId?: string;
  note?: string;
  date?: string;
  paidById?: string;
  visibility?: "PERSONAL" | "SHARED";
  splitType?: "NONE" | "EQUAL" | "CUSTOM";
  sharedMemberIds?: string[];
  customShares?: { memberId: string; amount: number }[];
  hasReceipt?: boolean;
};

export function TransactionForm({ initial, currentMemberId }: { initial?: TransactionFormInitial; currentMemberId: string }) {
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  const [type, setType] = useState<"INCOME" | "EXPENSE">(initial?.type ?? "EXPENSE");
  const [amount, setAmount] = useState<string>(initial?.amount ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10));
  const [paidById, setPaidById] = useState(initial?.paidById ?? currentMemberId);
  const [visibility, setVisibility] = useState<"PERSONAL" | "SHARED">(initial?.visibility ?? "PERSONAL");
  const [splitType, setSplitType] = useState<"NONE" | "EQUAL" | "CUSTOM">(initial?.splitType ?? "EQUAL");
  const [sharedMemberIds, setSharedMemberIds] = useState<string[]>(initial?.sharedMemberIds ?? []);
  const [customShares, setCustomShares] = useState<Record<string, string>>(
    Object.fromEntries((initial?.customShares ?? []).map((c) => [c.memberId, String(c.amount)]))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(
    initial?.id && initial?.hasReceipt ? `/api/transactions/${initial.id}/receipt` : null,
  );
  const [removeExistingReceipt, setRemoveExistingReceipt] = useState(false);

  function pickReceipt(file: File | null) {
    if (!file) {
      setReceiptFile(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Chỉ chấp nhận ảnh");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Ảnh vượt 8MB");
      return;
    }
    setReceiptFile(file);
    setRemoveExistingReceipt(false);
    const url = URL.createObjectURL(file);
    setReceiptPreview(url);
  }

  function clearReceipt() {
    setReceiptFile(null);
    setReceiptPreview(null);
    setRemoveExistingReceipt(true);
  }

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then((d) => setCategories(d.items || []));
    fetch("/api/members").then((r) => r.json()).then((d) => setMembers(d.items || []));
  }, []);

  const filteredCats = categories.filter((c) => c.kind === type);

  function toggleShared(mid: string) {
    setSharedMemberIds((cur) => (cur.includes(mid) ? cur.filter((x) => x !== mid) : [...cur, mid]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      amount: Number(parseMoneyInput(amount).toString()),
      type,
      categoryId,
      note: note || null,
      date,
      paidById,
      visibility,
      splitType: visibility === "SHARED" ? splitType : "NONE",
      sharedMemberIds: visibility === "SHARED" ? sharedMemberIds : [],
      customShares:
        visibility === "SHARED" && splitType === "CUSTOM"
          ? sharedMemberIds.map((mid) => ({ memberId: mid, amount: Number(parseMoneyInput(customShares[mid] || "0").toString()) }))
          : [],
    };

    const url = initial?.id ? `/api/transactions/${initial.id}` : "/api/transactions";
    const method = initial?.id ? "PUT" : "POST";

    try {
      const res = await fetchWithTimeout(
        url,
        { method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) },
        15000,
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data.error || "Lưu giao dịch thất bại";
        setError(msg);
        toast.error(msg);
        setLoading(false);
        return;
      }

      const respJson = await res.json().catch(() => ({} as { id?: string }));
      const txId = (initial?.id ?? respJson.id) as string | undefined;

      // Receipt: upload mới hoặc xoá cũ
      if (txId) {
        try {
          if (receiptFile) {
            const fd = new FormData();
            fd.append("file", receiptFile);
            const r = await fetchWithTimeout(`/api/transactions/${txId}/receipt`, { method: "POST", body: fd }, 15000);
            if (!r.ok) {
              const d = await r.json().catch(() => ({}));
              toast.error(d.error || "Tải ảnh thất bại");
            }
          } else if (initial?.id && removeExistingReceipt) {
            await fetchWithTimeout(`/api/transactions/${txId}/receipt`, { method: "DELETE" }, 15000);
          }
        } catch {
          toast.error("Tải ảnh thất bại");
        }
      }

      toast.success(initial?.id ? "Đã cập nhật giao dịch" : "Đã thêm giao dịch");
      if (!initial?.id && type === "INCOME") fireConfetti();
      setLoading(false);
      await waitMs(3000);
      window.location.href = "/history";
    } catch {
      const msg = "Kết nối chậm hoặc máy chủ không phản hồi, vui lòng thử lại";
      setError(msg);
      toast.error(msg);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setType("EXPENSE")} className={`btn ${type === "EXPENSE" ? "bg-danger text-white" : "btn-ghost"}`}>Chi</button>
        <button type="button" onClick={() => setType("INCOME")} className={`btn ${type === "INCOME" ? "bg-success text-white" : "btn-ghost"}`}>Thu</button>
      </div>

      <div>
        <label className="label">Số tiền</label>
        <MoneyInput
          className="input text-2xl font-bold text-right"
          required
          value={amount}
          onValueChange={setAmount}
          placeholder="0 ₫"
        />
      </div>

      <div>
        <label className="label">Danh mục</label>
        <div className="flex flex-wrap gap-2">
          {filteredCats.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryId(c.id)}
              className={`chip border ${categoryId === c.id ? "bg-primary text-white border-primary" : "bg-white text-gray-700"}`}
            >
              <span className="mr-1">{c.icon}</span>{c.name}
            </button>
          ))}
          {filteredCats.length === 0 && <p className="text-sm text-gray-500">Chưa có danh mục.</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Ngày</label>
          <input type="date" className="input" required value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Người trả</label>
          <select className="input" value={paidById} onChange={(e) => setPaidById(e.target.value)}>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.user.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Ghi chú</label>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tuỳ chọn" />
      </div>

      <div>
        <label className="label">Ảnh hoá đơn / bill (tuỳ chọn)</label>
        {receiptPreview ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={receiptPreview} alt="bill" className="max-h-48 rounded-2xl border border-rose-100 shadow-sm" />
            <button
              type="button"
              onClick={clearReceipt}
              className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white border border-rose-200 text-danger text-sm shadow"
              aria-label="Xoá ảnh"
            >✕</button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center gap-2 px-4 py-6 rounded-2xl border-2 border-dashed border-rose-200 bg-rose-50/40 text-sm text-gray-600 cursor-pointer hover:bg-rose-50">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#E64980" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="2.5" />
              <circle cx="8.5" cy="10.5" r="1.5" />
              <path d="M21 16l-5-5-7 7" />
            </svg>
            <span className="font-medium">Chọn ảnh bill từ thư viện</span>
            <span className="text-[11px] text-gray-400">JPG/PNG/WEBP/HEIC, tối đa 8MB</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pickReceipt(e.target.files?.[0] ?? null)}
            />
          </label>
        )}
      </div>

      <div className="card !p-3 space-y-3">
        <div className="flex items-center gap-2">
          <input id="vis" type="checkbox" checked={visibility === "SHARED"} onChange={(e) => setVisibility(e.target.checked ? "SHARED" : "PERSONAL")} />
          <label htmlFor="vis" className="text-sm font-medium">Chia sẻ với thành viên khác</label>
        </div>

        {visibility === "SHARED" && (
          <>
            <div>
              <label className="label">Thành viên tham gia</label>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleShared(m.id)}
                    className={`chip border ${sharedMemberIds.includes(m.id) ? "bg-primary text-white border-primary" : "bg-white"}`}
                  >
                    {m.user.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Cách chia</label>
              <div className="grid grid-cols-3 gap-2 text-sm">
                {(["EQUAL", "CUSTOM", "NONE"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSplitType(s)}
                    className={`btn ${splitType === s ? "btn-primary" : "btn-ghost"}`}
                  >
                    {s === "EQUAL" ? "Đều" : s === "CUSTOM" ? "Tuỳ chỉnh" : "Không chia"}
                  </button>
                ))}
              </div>
            </div>
            {splitType === "CUSTOM" && (
              <div className="space-y-2">
                {sharedMemberIds.map((mid) => {
                  const m = members.find((x) => x.id === mid);
                  return (
                    <div key={mid} className="flex items-center gap-2">
                      <span className="text-sm flex-1">{m?.user.name}</span>
                      <MoneyInput
                        className="input !w-44 text-right"
                        placeholder="0 ₫"
                        value={customShares[mid] ?? ""}
                        onValueChange={(v) => setCustomShares((s) => ({ ...s, [mid]: v }))}
                      />
                    </div>
                  );
                })}
                <p className="text-xs text-gray-500">Tổng các phần phải bằng số tiền giao dịch.</p>
              </div>
            )}
          </>
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button className="btn-primary w-full" disabled={loading}>
        {loading ? "Đang lưu..." : initial?.id ? "Cập nhật" : "Lưu giao dịch"}
      </button>
    </form>
  );
}
