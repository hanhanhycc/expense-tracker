"use client";

import { useEffect, useState } from "react";

type Cat = { id: string; name: string; kind: "INCOME" | "EXPENSE"; icon: string | null; color: string | null; isDefault: boolean };

export function CategoriesClient({ canManage }: { canManage: boolean }) {
  const [items, setItems] = useState<Cat[]>([]);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [icon, setIcon] = useState("📦");

  async function load() {
    const r = await fetch("/api/categories");
    setItems((await r.json()).items || []);
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/categories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, kind, icon }),
    });
    setName("");
    load();
  }

  async function remove(id: string) {
    if (!confirm("Xoá danh mục này?")) return;
    const r = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (!r.ok) alert((await r.json()).error || "Lỗi");
    load();
  }

  const expense = items.filter((c) => c.kind === "EXPENSE");
  const income = items.filter((c) => c.kind === "INCOME");

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Danh mục</h1>

      {canManage && (
        <form onSubmit={add} className="card grid grid-cols-12 gap-2 items-end">
          <div className="col-span-2">
            <label className="label">Icon</label>
            <input className="input text-center" maxLength={2} value={icon} onChange={(e) => setIcon(e.target.value)} />
          </div>
          <div className="col-span-6">
            <label className="label">Tên</label>
            <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="col-span-4">
            <label className="label">Loại</label>
            <select className="input" value={kind} onChange={(e) => setKind(e.target.value as "INCOME" | "EXPENSE")}>
              <option value="EXPENSE">Chi</option>
              <option value="INCOME">Thu</option>
            </select>
          </div>
          <div className="col-span-12">
            <button className="btn-primary w-full">+ Thêm danh mục</button>
          </div>
        </form>
      )}

      <Section title="Danh mục Chi" items={expense} canManage={canManage} onDelete={remove} />
      <Section title="Danh mục Thu" items={income} canManage={canManage} onDelete={remove} />
    </div>
  );
}

function Section({ title, items, canManage, onDelete }: { title: string; items: Cat[]; canManage: boolean; onDelete: (id: string) => void }) {
  return (
    <div className="card">
      <h2 className="font-semibold mb-2">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">Chưa có.</p>
      ) : (
        <ul className="divide-y">
          {items.map((c) => (
            <li key={c.id} className="py-2 flex items-center justify-between">
              <span><span className="mr-2">{c.icon}</span>{c.name} {c.isDefault && <span className="ml-2 chip bg-gray-100 text-gray-500">mặc định</span>}</span>
              {canManage && <button onClick={() => onDelete(c.id)} className="text-xs text-danger">Xoá</button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
