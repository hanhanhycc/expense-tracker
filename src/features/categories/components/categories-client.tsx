"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useToast } from "@/components/toast";
import { IconPicker } from "@/components/icon-picker";

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
  const [editing, setEditing] = useState<Cat | null>(null);
  const [applying, setApplying] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toast = useToast();

  async function load() {
    const r = await fetch("/api/categories");
    setItems((await r.json()).items || []);
  }
  useEffect(() => {
    load();
  }, []);

  // Tự expand các group đã expanded mặc định khi load lần đầu
  useEffect(() => {
    if (items.length === 0) return;
    setExpanded((prev) => {
      if (Object.keys(prev).length > 0) return prev;
      const next: Record<string, boolean> = {};
      for (const c of items) if (!c.parentId) next[c.id] = true;
      return next;
    });
  }, [items]);

  const tabItems = useMemo(() => items.filter((c) => c.kind === tab), [items, tab]);
  const roots = useMemo(
    () => tabItems.filter((c) => !c.parentId).sort((a, b) => a.sortOrder - b.sortOrder),
    [tabItems],
  );
  const childrenOf = (parentId: string) =>
    tabItems.filter((c) => c.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder);

  async function applyDefaults() {
    if (!confirm("Áp dụng cấu trúc danh mục mặc định? Idempotent — không xoá categories cũ.")) return;
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

  // ─────────────────────────────────────────────
  // Drag & drop
  // ─────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);

  function onDragStart(e: DragStartEvent) {
    setDraggingId(String(e.active.id));
  }

  async function onDragEnd(e: DragEndEvent) {
    setDraggingId(null);
    if (!e.over || e.active.id === e.over.id) return;

    const activeId = String(e.active.id);
    const overId = String(e.over.id);
    const active = tabItems.find((c) => c.id === activeId);
    const over = tabItems.find((c) => c.id === overId);
    if (!active || !over) return;

    // Tính toán: drop active trước over → đảo vị trí trong list của parent over
    // Nếu active và over cùng parent → chỉ reorder
    // Nếu khác parent → chuyển parent của active sang parent của over
    const newParentId = over.parentId; // nếu over là root, parentId=null → active sẽ thành root
    if (active.parentId === over.parentId) {
      // Reorder cùng parent
      const siblings = tabItems
        .filter((c) => c.parentId === active.parentId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      const oldIdx = siblings.findIndex((c) => c.id === activeId);
      const newIdx = siblings.findIndex((c) => c.id === overId);
      if (oldIdx === -1 || newIdx === -1) return;
      const reordered = arrayMove(siblings, oldIdx, newIdx);
      const payload = reordered.map((c, idx) => ({ id: c.id, parentId: c.parentId, sortOrder: idx }));

      // Optimistic update
      setItems((prev) => {
        const map = new Map(prev.map((x) => [x.id, x]));
        for (const p of payload) {
          const x = map.get(p.id);
          if (x) map.set(p.id, { ...x, sortOrder: p.sortOrder });
        }
        return Array.from(map.values());
      });

      try {
        const r = await fetch("/api/categories/reorder", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ items: payload }),
        });
        if (!r.ok) throw new Error();
      } catch {
        toast.error("Sắp xếp thất bại, đang tải lại...");
        load();
      }
    } else {
      // Chuyển parent
      // Active không thể là root (có children) — nếu là root có children, kéo vào group khác sẽ thành child của group đó nhưng mất children → block
      const hasChildren = tabItems.some((c) => c.parentId === activeId);
      if (hasChildren) {
        toast.error("Không thể kéo nhóm có danh mục con vào nhóm khác. Hãy chuyển con trước.");
        return;
      }
      // Validate: nếu over là child (có parentId), thì newParentId = parent của over (root đó). Nếu over là root, newParentId = root đó (active thành con của over).
      const targetParentId = over.parentId ?? over.id;

      // Reorder trong destination
      const destSiblings = tabItems
        .filter((c) => c.parentId === targetParentId && c.id !== activeId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      // Tính insert position
      const overIdxInDest = destSiblings.findIndex((c) => c.id === overId);
      const insertIdx = overIdxInDest === -1 ? destSiblings.length : overIdxInDest;
      const withInserted = [
        ...destSiblings.slice(0, insertIdx),
        { ...active, parentId: targetParentId },
        ...destSiblings.slice(insertIdx),
      ];
      const payload = withInserted.map((c, idx) => ({
        id: c.id,
        parentId: targetParentId,
        sortOrder: idx,
      }));

      setItems((prev) =>
        prev.map((x) => {
          const upd = payload.find((p) => p.id === x.id);
          return upd ? { ...x, parentId: upd.parentId, sortOrder: upd.sortOrder } : x;
        }),
      );

      try {
        const r = await fetch("/api/categories/reorder", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ items: payload }),
        });
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error(err.error || "");
        }
        // Auto-expand destination group
        setExpanded((s) => ({ ...s, [targetParentId]: true }));
        toast.success("Đã chuyển nhóm");
      } catch (err) {
        toast.error((err as Error).message || "Chuyển nhóm thất bại, đang tải lại...");
        load();
      }
    }
  }

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">Danh mục</h1>
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
          className={`flex-1 py-2 rounded-full font-semibold text-sm transition ${
            tab === "EXPENSE" ? "bg-danger text-white" : "bg-white border border-gray-200"
          }`}
        >
          Chi
        </button>
        <button
          onClick={() => setTab("INCOME")}
          className={`flex-1 py-2 rounded-full font-semibold text-sm transition ${
            tab === "INCOME" ? "bg-success text-white" : "bg-white border border-gray-200"
          }`}
        >
          Thu
        </button>
      </div>

      {canManage && (
        <button onClick={() => setShowAdd({ parentId: null })} className="btn-primary w-full text-sm">
          + Thêm nhóm cha
        </button>
      )}

      {canManage && (
        <p className="text-[11px] text-gray-500 -mt-1">
          💡 Giữ và kéo (drag) để sắp xếp lại hoặc chuyển sang nhóm khác. Bấm 🖊 để sửa tên/icon.
        </p>
      )}

      <div className="card !p-0">
        {roots.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-500">
            Chưa có danh mục. Bấm "Áp dụng cấu trúc mặc định" để bắt đầu.
          </p>
        ) : (
          <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            {/* Mọi item thuộc tab này nằm trong 1 sortable context. parentId quyết định nhóm. */}
            <SortableContext
              items={tabItems.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="divide-y">
                {roots.map((g) => {
                  const kids = childrenOf(g.id);
                  const isExpanded = expanded[g.id] ?? true;
                  return (
                    <li key={g.id}>
                      <CategoryRow
                        cat={g}
                        canManage={canManage}
                        isGroup
                        hasChildren={kids.length > 0}
                        isExpanded={isExpanded}
                        onToggleExpand={() => setExpanded((s) => ({ ...s, [g.id]: !isExpanded }))}
                        onAddChild={() => setShowAdd({ parentId: g.id })}
                        onEdit={() => setEditing(g)}
                        onToggleEnable={() => toggleEnable(g)}
                        onDelete={() => remove(g.id)}
                        dragging={draggingId === g.id}
                      />
                      {isExpanded && kids.length > 0 && (
                        <ul className="bg-gray-50/50">
                          {kids.map((c) => (
                            <li key={c.id}>
                              <CategoryRow
                                cat={c}
                                canManage={canManage}
                                isGroup={false}
                                hasChildren={false}
                                onEdit={() => setEditing(c)}
                                onToggleEnable={() => toggleEnable(c)}
                                onDelete={() => remove(c.id)}
                                dragging={draggingId === c.id}
                              />
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {!canManage && (
        <p className="text-xs text-gray-500 text-center">
          Chỉ ADMIN/OWNER mới có thể sửa danh mục.
        </p>
      )}

      {showAdd && (
        <AddModal
          parentId={showAdd.parentId}
          kind={tab}
          roots={roots}
          onClose={() => setShowAdd(null)}
          onCreated={() => {
            setShowAdd(null);
            load();
          }}
        />
      )}

      {editing && (
        <EditModal
          cat={editing}
          rootsSameKind={items
            .filter((c) => c.kind === editing.kind && !c.parentId && c.id !== editing.id)
            .sort((a, b) => a.sortOrder - b.sortOrder)}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Row component (sortable)
// ─────────────────────────────────────────────
function CategoryRow({
  cat,
  canManage,
  isGroup,
  hasChildren,
  isExpanded,
  dragging,
  onToggleExpand,
  onAddChild,
  onEdit,
  onToggleEnable,
  onDelete,
}: {
  cat: Cat;
  canManage: boolean;
  isGroup: boolean;
  hasChildren: boolean;
  isExpanded?: boolean;
  dragging: boolean;
  onToggleExpand?: () => void;
  onAddChild?: () => void;
  onEdit: () => void;
  onToggleEnable: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: cat.id,
    disabled: !canManage,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${dragging ? "bg-rose-50" : ""} ${!cat.isEnabled ? "opacity-40" : ""} ${
        isGroup ? "px-3 py-2.5" : "pl-10 pr-3 py-2"
      } flex items-center gap-2`}
    >
      {canManage && (
        <button
          {...attributes}
          {...listeners}
          className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing px-1 touch-none"
          aria-label="Kéo để sắp xếp"
          type="button"
        >
          ⋮⋮
        </button>
      )}

      {isGroup && hasChildren ? (
        <button
          onClick={onToggleExpand}
          className="text-gray-400 w-5 flex-shrink-0"
          aria-label="Mở/đóng"
        >
          {isExpanded ? "▾" : "▸"}
        </button>
      ) : (
        <span className="w-5 flex-shrink-0" />
      )}

      <span className={`flex-shrink-0 ${isGroup ? "text-lg" : "text-base"}`}>{cat.icon || "📦"}</span>
      <span
        className={`flex-1 min-w-0 truncate ${
          isGroup ? "font-semibold text-primary-700" : "text-gray-700"
        }`}
      >
        {cat.name}
      </span>

      {canManage && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {isGroup && onAddChild && (
            <button onClick={onAddChild} className="text-xs text-primary-700 hover:underline" title="Thêm danh mục con">
              + con
            </button>
          )}
          <button onClick={onEdit} className="text-xs text-gray-500 hover:text-primary-700" title="Sửa">
            🖊
          </button>
          <button
            onClick={onToggleEnable}
            className="text-xs text-gray-500 hover:text-gray-700"
            title={cat.isEnabled ? "Tắt" : "Bật"}
          >
            {cat.isEnabled ? "👁" : "🙈"}
          </button>
          <button onClick={onDelete} className="text-xs text-danger hover:underline" title="Xoá">
            Xoá
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Add modal (form thêm mới)
// ─────────────────────────────────────────────
function AddModal({
  parentId,
  kind,
  roots,
  onClose,
  onCreated,
}: {
  parentId: string | null;
  kind: "INCOME" | "EXPENSE";
  roots: Cat[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📦");
  const [parent, setParent] = useState<string>(parentId || "");
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const r = await fetch("/api/categories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, icon, kind, parentId: parent || null }),
    });
    setLoading(false);
    if (!r.ok) {
      toast.error((await r.json().catch(() => ({}))).error || "Thêm thất bại");
      return;
    }
    toast.success("Đã thêm danh mục");
    onCreated();
  }

  return (
    <ModalShell title={parentId ? "Thêm danh mục con" : "Thêm nhóm cha"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-3">
            <label className="label">Icon</label>
            <IconPicker value={icon} onChange={setIcon} />
          </div>
          <div className="col-span-9">
            <label className="label">Tên</label>
            <input
              className="input"
              required
              autoFocus
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={parentId ? "VD: Cafe" : "VD: Du lịch"}
            />
          </div>
        </div>

        <div>
          <label className="label">Thuộc nhóm cha</label>
          <select className="input" value={parent} onChange={(e) => setParent(e.target.value)}>
            <option value="">— Không (là nhóm cha gốc) —</option>
            {roots.map((r) => (
              <option key={r.id} value={r.id}>
                {r.icon} {r.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 pt-2">
          <button type="button" className="btn-ghost flex-1" onClick={onClose}>
            Huỷ
          </button>
          <button className="btn-primary flex-1" type="submit" disabled={loading}>
            {loading ? "Đang lưu..." : "+ Thêm"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ─────────────────────────────────────────────
// Edit modal
// ─────────────────────────────────────────────
function EditModal({
  cat,
  rootsSameKind,
  onClose,
  onSaved,
}: {
  cat: Cat;
  rootsSameKind: Cat[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(cat.name);
  const [icon, setIcon] = useState(cat.icon || "📦");
  const [parent, setParent] = useState<string>(cat.parentId || "");
  const [color, setColor] = useState<string>(cat.color || "");
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const r = await fetch(`/api/categories/${cat.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        icon,
        color: color || null,
        parentId: parent || null,
      }),
    });
    setLoading(false);
    if (!r.ok) {
      toast.error((await r.json().catch(() => ({}))).error || "Cập nhật thất bại");
      return;
    }
    toast.success("Đã cập nhật");
    onSaved();
  }

  const PALETTE = ["#F783A8", "#f59e0b", "#0ea5e9", "#6366f1", "#ec4899", "#10b981", "#8b5cf6", "#f43f5e", "#14b8a6", "#3b82f6", "#6b7280"];

  return (
    <ModalShell title="Sửa danh mục" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-3">
            <label className="label">Icon</label>
            <IconPicker value={icon} onChange={setIcon} />
          </div>
          <div className="col-span-9">
            <label className="label">Tên</label>
            <input className="input" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label">Thuộc nhóm cha</label>
          <select className="input" value={parent} onChange={(e) => setParent(e.target.value)}>
            <option value="">— Không (là nhóm cha gốc) —</option>
            {rootsSameKind.map((r) => (
              <option key={r.id} value={r.id}>
                {r.icon} {r.name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-gray-400 mt-1">
            Đổi nhóm cha = chuyển sang group khác. Để trống = thành nhóm cha gốc.
          </p>
        </div>

        <div>
          <label className="label">Màu (tuỳ chọn)</label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setColor("")}
              className={`w-8 h-8 rounded-full border-2 ${color === "" ? "border-primary" : "border-gray-200"} bg-white text-xs text-gray-400`}
            >
              ✕
            </button>
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full border-2 ${color === c ? "border-gray-900" : "border-transparent"}`}
                style={{ background: c }}
                aria-label={c}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button type="button" className="btn-ghost flex-1" onClick={onClose}>
            Huỷ
          </button>
          <button className="btn-primary flex-1" type="submit" disabled={loading}>
            {loading ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end desktop:items-center justify-center p-0 desktop:p-4" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl desktop:rounded-3xl w-full max-w-md p-5 pb-8 desktop:pb-5 shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-gray-100 text-gray-500 text-xl flex items-center justify-center">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
