"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/toast";

type Cat = {
  id: string;
  name: string;
  kind: "INCOME" | "EXPENSE";
  icon: string | null;
  color: string | null;
  isDefault: boolean;
  isEnabled: boolean;
  parentId: string | null;
  sortOrder: number;
};

export function CategoriesClient({ canManage }: { canManage: boolean }) {
  const [items, setItems] = useState<Cat[]>([]);
  const [tab, setTab] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [showAdd, setShowAdd] = useState<null | { parentId: string | null }>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📦");
  const [applying, setApplying] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toast = useToast();

  async function load() {
    const r = await fetch("/api/categories");
    const data = (await r.json()).items || [];
    setItems(data);
  }
  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!showAdd) return;
    const r = await fetch("/api/categories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, kind: tab, icon, parentId: showAdd.parentId }),
    });
    if (!r.ok) {
      toast.error((await r.json().catch(() => ({}))).error || "Thêm thất bại");
      return;
    }
    toast.success("Đã thêm danh mục");
    setName("");
    setIcon("📦");
    setShowAdd(null);
    load();
  }

  async function toggleEnable(c: Cat) {
    const r = await fetch(`/api/categories/${c.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isEnabled: !c.isEnabled }),
    });
    if (!r.ok) {
      toast.error("Cập nhật thất bại");
      return;
    }
    setItems((prev) => prev.map((x) => (x.id === c.id ? { ...x, isEnabled: !c.isEnabled } : x)));
  }

  async function remove(id: string) {
    if (!confirm("Xoá danh mục này?")) return;
    const r = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (!r.ok) {
      toast.error((await r.json().catch(() => ({}))).error || "Xoá thất bại");
      return;
    }
    toast.success("Đã xoá");
    load();
  }

  async function applyDefaults() {
    if (!confirm("Áp dụng cấu trúc danh mục mặc định? Không xoá categories cũ, chỉ thêm bộ mới (idempotent).")) return;
    setApplying(true);
    const r = await fetch("/api/categories/apply-defaults", { method: "POST" });
    setApplying(false);
    if (!r.ok) {
      toast.error("Áp dụng thất bại");
      return;
    }
    const data = await r.json();
    toast.success(`Đã thêm ${data.added} danh mục mới`);
    load();
  }

  // Build tree
  const tabItems = items.filter((c) => c.kind === tab);
  const roots = tabItems.filter((c) => !c.parentId).sort((a, b) => a.sortOrder - b.sortOrder);
  const childrenOf = (parentId: string) =>
    tabItems.filter((c) => c.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Danh mục</h1>
        {canManage && (
          <button
            onClick={applyDefaults}
            disabled={applying}
            className="text-xs text-primary-700 hover:underline disabled:text-gray-400"
          >
            {applying ? "Đang áp dụng..." : "📥 Áp dụng cấu trúc mặc định"}
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab("EXPENSE")}
          className={`flex-1 py-2 rounded-full font-semibold text-sm transition ${tab === "EXPENSE" ? "bg-danger text-white" : "bg-white border border-gray-200"}`}
        >
          Chi
        </button>
        <button
          onClick={() => setTab("INCOME")}
          className={`flex-1 py-2 rounded-full font-semibold text-sm transition ${tab === "INCOME" ? "bg-success text-white" : "bg-white border border-gray-200"}`}
        >
          Thu
        </button>
      </div>

      {canManage && (
        <button
          onClick={() => setShowAdd({ parentId: null })}
          className="btn-primary w-full text-sm"
        >
          + Thêm nhóm cha
        </button>
      )}

      {showAdd && (
        <form onSubmit={add} className="card grid grid-cols-12 gap-2 items-end border-2 border-primary/40">
          <div className="col-span-12 text-sm text-gray-600 mb-1">
            {showAdd.parentId === null ? "Thêm nhóm cha mới" : "Thêm danh mục con"}
          </div>
          <div className="col-span-2">
            <label className="label">Icon</label>
            <input className="input text-center" maxLength={2} value={icon} onChange={(e) => setIcon(e.target.value)} />
          </div>
          <div className="col-span-10">
            <label className="label">Tên</label>
            <input
              className="input"
              required
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Cafe"
              autoFocus
            />
          </div>
          <div className="col-span-12 flex gap-2">
            <button type="button" className="btn-ghost flex-1" onClick={() => setShowAdd(null)}>
              Huỷ
            </button>
            <button className="btn-primary flex-1" type="submit">+ Thêm</button>
          </div>
        </form>
      )}

      <div className="card !p-0">
        {roots.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-500">
            Chưa có danh mục nào. Bấm "Áp dụng cấu trúc mặc định" để bắt đầu.
          </p>
        ) : (
          <ul className="divide-y">
            {roots.map((g) => {
              const kids = childrenOf(g.id);
              const isExpanded = expanded[g.id] ?? true;
              return (
                <li key={g.id}>
                  <div className={`px-3 py-2.5 flex items-center gap-2 ${!g.isEnabled ? "opacity-40" : ""}`}>
                    {kids.length > 0 ? (
                      <button
                        onClick={() => setExpanded((s) => ({ ...s, [g.id]: !isExpanded }))}
                        className="text-gray-400 w-5"
                        aria-label="Toggle"
                      >
                        {isExpanded ? "▾" : "▸"}
                      </button>
                    ) : (
                      <span className="w-5" />
                    )}
                    <span className="text-lg">{g.icon || "📦"}</span>
                    <span className="flex-1 font-semibold text-primary-700">{g.name}</span>
                    {canManage && (
                      <>
                        <button
                          onClick={() => { setShowAdd({ parentId: g.id }); setIcon("📦"); }}
                          className="text-xs text-primary-700 hover:underline"
                        >
                          + con
                        </button>
                        <button
                          onClick={() => toggleEnable(g)}
                          className="text-xs text-gray-500 hover:text-gray-700"
                          title={g.isEnabled ? "Tắt" : "Bật"}
                        >
                          {g.isEnabled ? "👁" : "🙈"}
                        </button>
                        <button onClick={() => remove(g.id)} className="text-xs text-danger hover:underline">
                          Xoá
                        </button>
                      </>
                    )}
                  </div>
                  {isExpanded && kids.length > 0 && (
                    <ul className="divide-y bg-gray-50/50">
                      {kids.map((c) => (
                        <li
                          key={c.id}
                          className={`pl-12 pr-3 py-2 flex items-center gap-2 ${!c.isEnabled ? "opacity-40" : ""}`}
                        >
                          <span className="text-base">{c.icon || "📦"}</span>
                          <span className="flex-1 truncate">{c.name}</span>
                          {canManage && (
                            <>
                              <button
                                onClick={() => toggleEnable(c)}
                                className="text-xs text-gray-500 hover:text-gray-700"
                                title={c.isEnabled ? "Tắt" : "Bật"}
                              >
                                {c.isEnabled ? "👁" : "🙈"}
                              </button>
                              <button onClick={() => remove(c.id)} className="text-xs text-danger hover:underline">
                                Xoá
                              </button>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {!canManage && (
        <p className="text-xs text-gray-500 text-center">
          Chỉ ADMIN/OWNER mới có thể thêm/sửa/xoá danh mục.
        </p>
      )}
    </div>
  );
}
