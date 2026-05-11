"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatNumber, parseMoneyInput } from "@/lib/money";
import { useToast } from "@/components/toast";

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
};

export function TransactionForm({ initial, currentMemberId }: { initial?: TransactionFormInitial; currentMemberId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  const [type, setType] = useState<"INCOME" | "EXPENSE">(initial?.type ?? "EXPENSE");
  const [amount, setAmount] = useState<string>(initial?.amount ?? "");
  const [amountDisplay, setAmountDisplay] = useState<string>(initial?.amount ? formatNumber(initial.amount) : "");
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

    const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Lỗi không xác định");
      toast.error(data.error || "Lưu giao dịch thất bại");
      setLoading(false);
      return;
    }
    toast.success(initial?.id ? "Đã cập nhật giao dịch" : "Đã thêm giao dịch");
    router.push("/history");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setType("EXPENSE")} className={`btn ${type === "EXPENSE" ? "bg-danger text-white" : "btn-ghost"}`}>Chi</button>
        <button type="button" onClick={() => setType("INCOME")} className={`btn ${type === "INCOME" ? "bg-success text-white" : "btn-ghost"}`}>Thu</button>
      </div>

      <div>
        <label className="label">Số tiền</label>
        <input
          className="input text-2xl font-bold text-right"
          inputMode="numeric"
          required
          value={amountDisplay}
          onChange={(e) => {
            setAmountDisplay(e.target.value);
            setAmount(parseMoneyInput(e.target.value).toString());
          }}
          onBlur={() => setAmountDisplay(amount ? formatNumber(amount) + " ₫" : "")}
          onFocus={() => setAmountDisplay(amount)}
          placeholder="0"
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
                      <input
                        type="text"
                        inputMode="numeric"
                        className="input !w-40 text-right"
                        placeholder="0"
                        value={customShares[mid] ?? ""}
                        onChange={(e) => setCustomShares((s) => ({ ...s, [mid]: e.target.value.replace(/[^\d]/g, "") }))}
                      />
                      <span className="text-xs text-gray-500">₫</span>
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
