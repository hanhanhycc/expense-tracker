"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ICON_GROUPS, findGroupForIcon } from "@/lib/icon-library";
import { useClickOutside } from "@/lib/use-click-outside";

/**
 * IconPicker — popover hiển thị emoji theo nhóm + tìm kiếm + nhập tùy chỉnh.
 *
 * Usage:
 *   <IconPicker value={icon} onChange={setIcon} />
 */
export function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [activeKey, setActiveKey] = useState<string>("food");
  const [search, setSearch] = useState("");
  const [custom, setCustom] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside({ enabled: open, onClose: () => setOpen(false), ref });

  // Khi mở, tìm group chứa icon hiện tại
  useEffect(() => {
    if (!open) return;
    const g = value ? findGroupForIcon(value) : null;
    if (g) setActiveKey(g);
    setSearch("");
    setCustom("");
  }, [open, value]);

  const activeGroup = ICON_GROUPS.find((g) => g.key === activeKey) || ICON_GROUPS[0];

  // Filter theo search (search trong cả groups)
  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase().trim();
    const results: { icon: string; groupLabel: string }[] = [];
    for (const g of ICON_GROUPS) {
      if (g.label.toLowerCase().includes(q)) {
        // Match group name → return all icons in group
        for (const ic of g.icons) results.push({ icon: ic, groupLabel: g.label });
      }
    }
    return results;
  }, [search]);

  function pick(emoji: string) {
    onChange(emoji);
    setOpen(false);
  }

  function applyCustom() {
    const c = custom.trim();
    if (!c) return;
    onChange(c);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input text-center !text-2xl !leading-none !py-2 hover:border-primary/40 transition cursor-pointer"
        aria-label="Chọn icon"
      >
        {value || "📦"}
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-2 w-[min(360px,calc(100vw-2rem))] bg-white rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.18)] border border-gray-100 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b">
            <input
              type="text"
              placeholder="🔎 Tìm nhóm: ăn uống, đi lại..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input !py-1.5 !text-sm w-full"
            />
          </div>

          {!searchResults && (
            <div className="flex gap-1 overflow-x-auto px-2 py-2 border-b">
              {ICON_GROUPS.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => setActiveKey(g.key)}
                  className={`shrink-0 px-2 py-1 rounded-full text-base transition ${
                    activeKey === g.key
                      ? "bg-primary/15 ring-1 ring-primary"
                      : "hover:bg-gray-100"
                  }`}
                  title={g.label}
                >
                  {g.emoji}
                </button>
              ))}
            </div>
          )}

          <div className="p-2 max-h-[260px] overflow-y-auto">
            {searchResults ? (
              searchResults.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-4">Không tìm thấy nhóm phù hợp</p>
              ) : (
                <div className="grid grid-cols-8 gap-1">
                  {searchResults.map((r, i) => (
                    <button
                      key={`${r.icon}-${i}`}
                      type="button"
                      onClick={() => pick(r.icon)}
                      className={`aspect-square rounded-lg flex items-center justify-center text-xl transition hover:bg-rose-50 active:scale-90 ${
                        value === r.icon ? "bg-primary/15 ring-1 ring-primary" : ""
                      }`}
                    >
                      {r.icon}
                    </button>
                  ))}
                </div>
              )
            ) : (
              <>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1 px-1">
                  {activeGroup.label}
                </p>
                <div className="grid grid-cols-8 gap-1">
                  {activeGroup.icons.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => pick(ic)}
                      className={`aspect-square rounded-lg flex items-center justify-center text-xl transition hover:bg-rose-50 active:scale-90 ${
                        value === ic ? "bg-primary/15 ring-1 ring-primary" : ""
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="p-2 border-t bg-gray-50 flex gap-2">
            <input
              type="text"
              placeholder="Hoặc nhập emoji tự chọn"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              maxLength={4}
              className="input !py-1.5 !text-sm flex-1 text-center"
            />
            <button
              type="button"
              onClick={applyCustom}
              disabled={!custom.trim()}
              className="btn-primary !py-1.5 !px-3 text-sm disabled:opacity-50"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
