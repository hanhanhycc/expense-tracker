"use client";

import { useEffect, useRef, useState } from "react";
import { parseMoneyInput } from "@/lib/money";
import { MoneyInput } from "@/components/money-input";
import { useToast } from "@/components/toast";
import { fireConfetti } from "@/components/confetti";
import { AccountBadge } from "@/components/account-badge";
import { useClickOutside } from "@/lib/use-click-outside";

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

type Category = {
  id: string;
  name: string;
  kind: "INCOME" | "EXPENSE";
  icon: string | null;
  color: string | null;
  parentId: string | null;
  isEnabled: boolean;
  sortOrder: number;
};
type Member = { id: string; user: { id: string; name: string }; role: string };
type Account = { id: string; name: string; type: string; icon: string | null; color: string | null; bankCode: string | null; isDefault: boolean };

export type TransactionFormInitial = {
  id?: string;
  type?: "INCOME" | "EXPENSE";
  amount?: string;
  categoryId?: string;
  accountId?: string | null;
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
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [type, setType] = useState<"INCOME" | "EXPENSE">(initial?.type ?? "EXPENSE");
  const [amount, setAmount] = useState<string>(initial?.amount ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [accountId, setAccountId] = useState<string>(initial?.accountId ?? "");
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

  // Khi đổi Chi/Thu mà categoryId hiện tại không thuộc kind mới → clear
  useEffect(() => {
    if (!categoryId) return;
    const cur = categories.find((c) => c.id === categoryId);
    if (cur && cur.kind !== type) setCategoryId("");
  }, [type, categoryId, categories]);

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then((d) => setCategories(d.items || []));
    fetch("/api/members").then((r) => r.json()).then((d) => setMembers(d.items || []));
    fetch("/api/accounts").then((r) => r.json()).then((d) => {
      const list: Account[] = d.items || [];
      setAccounts(list);
      // Nếu form mới chưa chọn account → auto chọn default
      if (!initial?.accountId && !accountId && list.length > 0) {
        const def = list.find((a) => a.isDefault) || list[0];
        setAccountId(def.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lọc theo type + isEnabled
  const filteredCats = categories.filter((c) => c.kind === type && c.isEnabled);
  const rootGroups = filteredCats
    .filter((c) => !c.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const childrenOf = (pid: string) =>
    filteredCats.filter((c) => c.parentId === pid).sort((a, b) => a.sortOrder - b.sortOrder);
  // Map id → cat để render selected
  const catById = new Map(filteredCats.map((c) => [c.id, c]));
  const selectedCat = categoryId ? catById.get(categoryId) : null;
  const selectedParent = selectedCat?.parentId ? catById.get(selectedCat.parentId) : null;

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
      accountId: accountId || null,
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

      <CategoryPicker
        groups={rootGroups}
        childrenOf={childrenOf}
        value={categoryId}
        selectedCat={selectedCat ?? null}
        selectedParent={selectedParent ?? null}
        onChange={setCategoryId}
      />


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
        <label className="label">Tài khoản</label>
        <AccountPicker accounts={accounts} value={accountId} onChange={setAccountId} />
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

/**
 * CategoryPicker — grid card + bottom sheet.
 * - Mobile: 4 cột card vuông, icon to, tên nhỏ phía dưới
 * - Group có children: click → bottom sheet hiện chip con
 * - Group leaf (no children): click chọn trực tiếp
 * - Selected: card highlight + banner ở trên
 */
function CategoryPicker({
  groups,
  childrenOf,
  value,
  selectedCat,
  selectedParent,
  onChange,
}: {
  groups: Category[];
  childrenOf: (parentId: string) => Category[];
  value: string;
  selectedCat: Category | null;
  selectedParent: Category | null;
  onChange: (id: string) => void;
}) {
  const [sheetGroupId, setSheetGroupId] = useState<string | null>(null);
  const sheetGroup = sheetGroupId ? groups.find((g) => g.id === sheetGroupId) : null;

  if (groups.length === 0) {
    return (
      <div>
        <label className="label">Danh mục</label>
        <p className="text-sm text-gray-500">
          Chưa có danh mục. Vào Cài đặt → Danh mục → Áp dụng cấu trúc mặc định.
        </p>
      </div>
    );
  }

  // Group với children sắp xếp lên trước, group leaf xuống sau
  const sortedGroups = [...groups].sort((a, b) => {
    const aHasKids = childrenOf(a.id).length > 0 ? 0 : 1;
    const bHasKids = childrenOf(b.id).length > 0 ? 0 : 1;
    if (aHasKids !== bHasKids) return aHasKids - bHasKids;
    return a.sortOrder - b.sortOrder;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="label !mb-0">Danh mục</label>
        {selectedCat && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-[11px] text-gray-400 hover:text-gray-600"
          >
            Bỏ chọn
          </button>
        )}
      </div>

      {/* Banner selected */}
      {selectedCat && (
        <button
          type="button"
          onClick={() => {
            // Click banner → mở lại sheet để đổi
            if (selectedCat.parentId) setSheetGroupId(selectedCat.parentId);
          }}
          className="w-full mb-3 px-3 py-2.5 rounded-2xl border-2 border-primary bg-primary/5 text-left flex items-center gap-3 hover:bg-primary/10 transition"
        >
          <span
            className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ background: (selectedCat.color || "#F783A8") + "22" }}
          >
            {selectedCat.icon || "📦"}
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 truncate">{selectedCat.name}</div>
            {selectedParent && (
              <div className="text-xs text-gray-500 truncate">
                {selectedParent.icon} {selectedParent.name}
              </div>
            )}
          </div>
          {selectedCat.parentId && <span className="text-xs text-primary-700">Đổi ›</span>}
        </button>
      )}

      {/* Grid card 4 cột mobile, 6 cột desktop */}
      <div className="grid grid-cols-4 desktop:grid-cols-6 gap-2">
        {sortedGroups.map((g) => {
          const kids = childrenOf(g.id);
          const hasKids = kids.length > 0;
          const isSelectedHere =
            (hasKids && selectedCat?.parentId === g.id) || (!hasKids && value === g.id);
          const bg = (g.color || "#F783A8") + "1A";

          return (
            <button
              key={g.id}
              type="button"
              onClick={() => {
                if (hasKids) {
                  setSheetGroupId(g.id);
                } else {
                  onChange(g.id);
                }
              }}
              className={`relative aspect-[1/1.1] rounded-2xl border-2 p-1.5 flex flex-col items-center justify-center gap-1 transition active:scale-95 ${
                isSelectedHere
                  ? "border-primary bg-primary/10 shadow-[0_4px_12px_rgba(247,131,168,0.25)]"
                  : "border-rose-100 bg-white hover:border-rose-200"
              }`}
            >
              <span
                className="w-9 h-9 rounded-xl flex items-center justify-center text-xl"
                style={{ background: bg }}
              >
                {g.icon || "📦"}
              </span>
              <span className="text-[11px] leading-tight text-center font-medium text-gray-700 line-clamp-2 px-0.5">
                {g.name}
              </span>
              {hasKids && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-gray-100 text-[9px] font-bold text-gray-500 flex items-center justify-center">
                  {kids.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom sheet hiển thị children */}
      {sheetGroup && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setSheetGroupId(null)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[80vh] overflow-y-auto p-4 pb-8 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center mb-3">
              <div className="w-12 h-1 bg-gray-200 rounded-full" />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <span
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                style={{ background: (sheetGroup.color || "#F783A8") + "22" }}
              >
                {sheetGroup.icon || "📦"}
              </span>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">{sheetGroup.name}</h3>
                <p className="text-xs text-gray-500">{childrenOf(sheetGroup.id).length} danh mục</p>
              </div>
              <button
                type="button"
                onClick={() => setSheetGroupId(null)}
                className="w-9 h-9 rounded-full hover:bg-gray-100 text-gray-500 text-xl flex items-center justify-center"
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-3 desktop:grid-cols-5 gap-2">
              {childrenOf(sheetGroup.id).map((c) => {
                const isSelected = value === c.id;
                const bg = (c.color || sheetGroup.color || "#F783A8") + "1A";
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onChange(c.id);
                      setSheetGroupId(null);
                    }}
                    className={`relative aspect-[1/1.1] rounded-2xl border-2 p-1.5 flex flex-col items-center justify-center gap-1 transition active:scale-95 ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-[0_4px_12px_rgba(247,131,168,0.25)]"
                        : "border-rose-100 bg-white hover:border-rose-200"
                    }`}
                  >
                    <span
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-xl"
                      style={{ background: bg }}
                    >
                      {c.icon || "📦"}
                    </span>
                    <span className="text-[11px] leading-tight text-center font-medium text-gray-700 line-clamp-2 px-0.5">
                      {c.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * AccountPicker — dropdown custom hiển thị logo bank thật.
 * Native <select> không render được logo nên phải tự làm dropdown.
 */
function AccountPicker({
  accounts,
  value,
  onChange,
}: {
  accounts: Account[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside({ enabled: open, onClose: () => setOpen(false), ref });

  const selected = accounts.find((a) => a.id === value) || null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="input w-full flex items-center gap-2 text-left"
      >
        {selected ? (
          <>
            <AccountBadge
              name={selected.name}
              icon={selected.icon}
              color={selected.color}
              bankCode={selected.bankCode}
              size={24}
            />
            <span className="flex-1 truncate">{selected.name}</span>
          </>
        ) : (
          <span className="flex-1 text-gray-500">— Không chọn —</span>
        )}
        <span className="text-gray-400">▾</span>
      </button>

      {open && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(false); }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-rose-50 ${!value ? "bg-rose-50" : ""}`}
          >
            <span className="w-6 h-6 inline-flex items-center justify-center text-gray-400">—</span>
            <span className="text-gray-500">Không chọn</span>
          </button>
          {accounts.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => { onChange(a.id); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-rose-50 ${value === a.id ? "bg-rose-50" : ""}`}
            >
              <AccountBadge name={a.name} icon={a.icon} color={a.color} bankCode={a.bankCode} size={24} />
              <span className="flex-1 truncate">{a.name}</span>
              {a.isDefault && <span className="text-[10px] text-primary">mặc định</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
