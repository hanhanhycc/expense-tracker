"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/toast";

export type AccountType = "CASH" | "BANK" | "CARD" | "EWALLET" | "OTHER";
export type Account = {
  id: string;
  name: string;
  type: AccountType;
  icon: string | null;
  color: string | null;
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
    setIcon(TYPE_DEFAULT_ICON[type]);
  }, [type]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/accounts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, type, icon }),
    });
    if (!r.ok) {
      toast.error((await r.json().catch(() => ({}))).error || "Thêm tài khoản thất bại");
      return;
    }
    toast.success("Đã thêm tài khoản");
    setName("");
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
      <div>
        <h1 className="text-xl font-bold">Tài khoản</h1>
        <p className="text-sm text-gray-500 mt-1">
          Nguồn tiền chi/thu: tiền mặt, ngân hàng, thẻ tín dụng, ví điện tử...
        </p>
      </div>

      {canManage && (
        <form onSubmit={add} className="card grid grid-cols-12 gap-2 items-end">
          <div className="col-span-2">
            <label className="label">Icon</label>
            <input className="input text-center" maxLength={2} value={icon} onChange={(e) => setIcon(e.target.value)} />
          </div>
          <div className="col-span-5">
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
      )}

      {(Object.keys(TYPE_LABEL) as AccountType[]).map((t) => {
        const list = grouped[t];
        if (!list.length) return null;
        return <Section key={t} title={TYPE_LABEL[t]} items={list} canManage={canManage} onSetDefault={setDefault} onDelete={remove} />;
      })}
    </div>
  );
}

function Section({
  title,
  items,
  canManage,
  onSetDefault,
  onDelete,
}: {
  title: string;
  items: Account[];
  canManage: boolean;
  onSetDefault: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="card">
      <h2 className="font-semibold mb-2">{title}</h2>
      <ul className="divide-y">
        {items.map((a) => (
          <li key={a.id} className="py-2 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-lg">{a.icon || "💼"}</span>
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
                <button onClick={() => onDelete(a.id)} className="text-xs text-danger hover:underline">Xoá</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
