"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/toast";
import { IconPicker } from "@/components/icon-picker";
import { AccountBadge } from "@/components/account-badge";
import { suggestBankFromName } from "@/lib/bank-suggestions";
import { BankPicker } from "./bank-picker";

export type AccountType = "CASH" | "BANK" | "CARD" | "EWALLET" | "OTHER";
export type Account = {
  id: string;
  name: string;
  type: AccountType;
  icon: string | null;
  color: string | null;
  bankCode: string | null;
  isDefault: boolean;
};

const TYPE_LABEL: Record<AccountType, string> = {
  CASH: "Tiền mặt",
  BANK: "Ngân hàng",
  CARD: "Thẻ tín dụng",
  EWALLET: "Ví điện tử",
  OTHER: "Khác",
};

const TYPE_DEFAULT_ICON: Record<AccountType, string> = {
  CASH: "💵",
  BANK: "🏦",
  CARD: "💳",
  EWALLET: "📱",
  OTHER: "💼",
};

export function AccountsClient({ canManage }: { canManage: boolean }) {
  const [items, setItems] = useState<Account[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("BANK");
  const [icon, setIcon] = useState("🏦");
  const [iconAuto, setIconAuto] = useState(true);
  const [editing, setEditing] = useState<Account | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const toast = useToast();

  async function load() {
    const r = await fetch("/api/accounts");
    setItems((await r.json()).items || []);
  }

  useEffect(() => {
    load();
  }, []);

  // Đổi icon mặc định khi đổi type (nếu user chưa custom)
  useEffect(() => {
    if (iconAuto) setIcon(TYPE_DEFAULT_ICON[type]);
  }, [type, iconAuto]);

  // Tự gợi ý icon theo tên (nếu user chưa pick tay)
  useEffect(() => {
    if (!iconAuto) return;
    const s = suggestBankFromName(name);
    if (s) setIcon(s.icon);
    else setIcon(TYPE_DEFAULT_ICON[type]);
  }, [name, type, iconAuto]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const suggested = suggestBankFromName(name);
    const r = await fetch("/api/accounts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, type, icon, color: suggested?.color ?? null }),
    });
    if (!r.ok) {
      toast.error((await r.json().catch(() => ({}))).error || "Thêm tài khoản thất bại");
      return;
    }
    toast.success("Đã thêm tài khoản");
    setName("");
    setIconAuto(true);
    load();
  }

  async function setDefault(id: string) {
    const r = await fetch(`/api/accounts/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
    if (!r.ok) {
      toast.error("Đặt mặc định thất bại");
      return;
    }
    load();
  }

  async function remove(id: string) {
    if (!confirm("Xoá tài khoản này? Các giao dịch cũ vẫn giữ nguyên nhưng không hiển thị tài khoản.")) return;
    const r = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    if (!r.ok) {
      toast.error((await r.json().catch(() => ({}))).error || "Xoá thất bại");
      return;
    }
    toast.success("Đã xoá tài khoản");
    load();
  }

  const grouped = items.reduce<Record<AccountType, Account[]>>(
    (acc, a) => {
      (acc[a.type] = acc[a.type] || []).push(a);
      return acc;
    },
    { CASH: [], BANK: [], CARD: [], EWALLET: [], OTHER: [] },
  );

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="px-1">
        <h1 className="text-2xl font-extrabold tracking-tight">Tài khoản</h1>
        <p className="text-sm text-ink-3 mt-1">
          Nguồn tiền chi/thu: tiền mặt, ngân hàng, thẻ tín dụng, ví điện tử...
        </p>
      </div>

      {canManage && (
        <>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="card w-full flex items-center gap-3 hover:shadow-md transition text-left"
          >
            <span className="w-10 h-10 rounded-full bg-primary/10 text-primary text-xl flex items-center justify-center">
              🏦
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-medium">Thêm tài khoản từ danh sách</span>
              <span className="block text-xs text-gray-500">Chọn nhanh ngân hàng / ví phổ biến</span>
            </span>
            <span className="text-gray-400">›</span>
          </button>

          <form onSubmit={add} className="card grid grid-cols-12 gap-2 items-end">
            <div className="col-span-12">
              <p className="text-xs text-gray-500">Hoặc nhập thủ công:</p>
            </div>
            <div className="col-span-3">
              <label className="label">Icon</label>
              <IconPicker value={icon} onChange={(v) => { setIcon(v); setIconAuto(false); }} />
            </div>
            <div className="col-span-4">
              <label className="label">Tên</label>
              <input
                className="input"
                required
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Vietcombank"
              />
            </div>
            <div className="col-span-5">
              <label className="label">Loại</label>
              <select className="input" value={type} onChange={(e) => setType(e.target.value as AccountType)}>
                {(Object.keys(TYPE_LABEL) as AccountType[]).map((t) => (
                  <option key={t} value={t}>{TYPE_LABEL[t]}</option>
                ))}
              </select>
            </div>
            <div className="col-span-12">
              <button className="btn-primary w-full">+ Thêm tài khoản</button>
            </div>
          </form>
        </>
      )}

      {(Object.keys(TYPE_LABEL) as AccountType[]).map((t) => {
        const list = grouped[t];
        if (!list.length) return null;
        return (
          <Section
            key={t}
            title={TYPE_LABEL[t]}
            items={list}
            canManage={canManage}
            onSetDefault={setDefault}
            onDelete={remove}
            onEdit={(a) => setEditing(a)}
          />
        );
      })}

      {editing && (
        <EditAccountModal
          account={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      {pickerOpen && (
        <BankPicker
          onClose={() => setPickerOpen(false)}
          onPick={async (item) => {
            const exists = items.find(
              (a) => a.name.trim().toLowerCase() === item.name.trim().toLowerCase(),
            );
            if (exists) {
              toast.error(`Tài khoản "${item.name}" đã tồn tại`);
              setPickerOpen(false);
              return;
            }
            const suggested = suggestBankFromName(item.name);
            const r = await fetch("/api/accounts", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                name: item.name,
                type: item.type,
                icon: suggested?.icon ?? TYPE_DEFAULT_ICON[item.type],
                color: suggested?.color ?? null,
                bankCode: item.bankCode ?? null,
              }),
            });
            setPickerOpen(false);
            if (!r.ok) {
              toast.error((await r.json().catch(() => ({}))).error || "Thêm thất bại");
              return;
            }
            toast.success(`Đã thêm ${item.name}`);
            load();
          }}
        />
      )}
    </div>
  );
}

function Section({
  title,
  items,
  canManage,
  onSetDefault,
  onDelete,
  onEdit,
}: {
  title: string;
  items: Account[];
  canManage: boolean;
  onSetDefault: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (a: Account) => void;
}) {
  return (
    <div className="card">
      <h2 className="font-semibold mb-2">{title}</h2>
      <ul className="divide-y">
        {items.map((a) => (
          <li key={a.id} className="py-2 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 min-w-0 flex-1">
              <AccountBadge name={a.name} icon={a.icon} color={a.color} bankCode={a.bankCode} size={36} />
              <span className="truncate">{a.name}</span>
              {a.isDefault && <span className="chip bg-primary/10 text-primary text-[10px]">mặc định</span>}
            </span>
            {canManage && (
              <div className="flex items-center gap-3">
                {!a.isDefault && (
                  <button onClick={() => onSetDefault(a.id)} className="text-xs text-primary-700 hover:underline">
                    Đặt mặc định
                  </button>
                )}
                <button onClick={() => onEdit(a)} className="text-xs text-primary hover:underline">Sửa</button>
                <button onClick={() => onDelete(a.id)} className="text-xs text-danger hover:underline">Xoá</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EditAccountModal({
  account,
  onClose,
  onSaved,
}: {
  account: Account;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(account.name);
  const [type, setType] = useState<AccountType>(account.type);
  const [icon, setIcon] = useState(account.icon || TYPE_DEFAULT_ICON[account.type]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  function applySuggestion() {
    const s = suggestBankFromName(name);
    if (s) {
      setIcon(s.icon);
      toast.success(`Áp dụng icon ${s.icon} cho ${s.label}`);
    } else {
      toast.error("Chưa có gợi ý cho tên này");
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const suggested = suggestBankFromName(name);
    const r = await fetch(`/api/accounts/${account.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        type,
        icon,
        color: suggested?.color ?? account.color ?? null,
      }),
    });
    setLoading(false);
    if (!r.ok) {
      toast.error((await r.json().catch(() => ({}))).error || "Lưu thất bại");
      return;
    }
    toast.success("Đã cập nhật");
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl p-5 w-full max-w-md space-y-3 shadow-xl"
      >
        <div className="flex justify-between items-center">
          <h2 className="font-semibold">Sửa tài khoản</h2>
          <button type="button" onClick={onClose} className="text-gray-500">✕</button>
        </div>

        <div className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-3">
            <label className="label">Icon</label>
            <IconPicker value={icon} onChange={setIcon} />
          </div>
          <div className="col-span-9">
            <label className="label">Tên</label>
            <input
              className="input"
              required
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label">Loại</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value as AccountType)}>
            {(Object.keys(TYPE_LABEL) as AccountType[]).map((t) => (
              <option key={t} value={t}>{TYPE_LABEL[t]}</option>
            ))}
          </select>
        </div>

        <button type="button" onClick={applySuggestion} className="text-xs text-primary hover:underline">
          🪄 Tự gợi ý icon theo tên
        </button>

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Huỷ</button>
          <button className="btn-primary flex-1" disabled={loading}>
            {loading ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </form>
    </div>
  );
}
