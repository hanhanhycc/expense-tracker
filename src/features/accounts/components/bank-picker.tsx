"use client";

import { useEffect, useMemo, useState } from "react";
import { BANK_CATALOG, searchBankCatalog, type BankCatalogItem } from "@/lib/bank-catalog";
import { findBrandBadge } from "@/lib/brand-badges";
import { AccountBadge } from "@/components/account-badge";

const TYPE_GROUPS: { type: BankCatalogItem["type"]; label: string }[] = [
  { type: "BANK", label: "Ngân hàng" },
  { type: "EWALLET", label: "Ví điện tử" },
  { type: "CARD", label: "Thẻ" },
  { type: "CASH", label: "Tiền mặt" },
];

export function BankPicker({
  onPick,
  onClose,
}: {
  onPick: (item: BankCatalogItem) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const list = useMemo(() => searchBankCatalog(q), [q]);

  // Lock scroll khi mở
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Group theo type, giữ thứ tự đã định
  const grouped = TYPE_GROUPS.map((g) => ({
    ...g,
    items: list.filter((b) => b.type === g.type),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl shadow-xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">Chọn ngân hàng / ví</h2>
            <button onClick={onClose} className="text-gray-500">✕</button>
          </div>
          <input
            type="text"
            className="input"
            placeholder="🔎 Tìm Vietcombank, MoMo, HSBC..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
        </div>

        <div className="overflow-y-auto p-2 flex-1">
          {grouped.length === 0 && (
            <p className="text-center text-sm text-gray-500 py-8">
              Không tìm thấy. Bạn vẫn có thể tự nhập tên ở form.
            </p>
          )}
          {grouped.map((g) => (
            <div key={g.type} className="mb-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 px-2 mb-1">
                {g.label}
              </p>
              <ul>
                {g.items.map((b) => {
                  const badge = findBrandBadge(b.name);
                  return (
                    <li key={b.name}>
                      <button
                        type="button"
                        onClick={() => onPick(b)}
                        className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-rose-50 transition text-left"
                      >
                        <AccountBadge name={b.name} size={36} />
                        <span className="flex-1 min-w-0">
                          <span className="block font-medium truncate">{b.name}</span>
                          {badge && (
                            <span className="block text-xs text-gray-500">{g.label}</span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {!q && (
            <p className="text-center text-xs text-gray-400 py-3">
              Tổng cộng {BANK_CATALOG.length} ngân hàng & ví được hỗ trợ
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
