// Catalog các ngân hàng / ví / thẻ — chọn nhanh khi tạo tài khoản mới.
// Nguồn ngân hàng + logo: VietQR CDN (https://cdn.vietqr.io/img/<code>.png).

import type { AccountType } from "@prisma/client";
import { VIETQR_BANKS } from "./vietqr-banks";

export type BankCatalogItem = {
  /** Tên hiển thị + lưu vào DB (Account.name) */
  name: string;
  /** Loại tài khoản */
  type: AccountType;
  /** VietQR code nếu có (để render logo từ cdn.vietqr.io) */
  bankCode?: string;
  /** Bí danh để search */
  aliases?: string[];
};

// Map từ VietQR banks → catalog items
const FROM_VIETQR: BankCatalogItem[] = VIETQR_BANKS.map((b) => ({
  name: b.shortName,
  type: b.type,
  bankCode: b.code,
  aliases: [b.code.toLowerCase(), b.name.toLowerCase()],
}));

// Thẻ + tiền mặt (không có trong VietQR, dùng brand-badge fallback)
const EXTRA_ITEMS: BankCatalogItem[] = [
  { name: "Visa", type: "CARD", aliases: [] },
  { name: "Mastercard", type: "CARD", aliases: ["master"] },
  { name: "JCB", type: "CARD", aliases: [] },
  { name: "American Express", type: "CARD", aliases: ["amex"] },
  { name: "Apple Pay", type: "CARD", aliases: ["apple"] },
  { name: "Google Pay", type: "CARD", aliases: ["gpay", "google"] },
  { name: "Tiền mặt", type: "CASH", aliases: ["cash", "tien mat"] },
];

export const BANK_CATALOG: BankCatalogItem[] = [...FROM_VIETQR, ...EXTRA_ITEMS];

/** Lọc catalog theo query. */
export function searchBankCatalog(query: string): BankCatalogItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return BANK_CATALOG;
  return BANK_CATALOG.filter(
    (b) =>
      b.name.toLowerCase().includes(q) ||
      (b.aliases ?? []).some((a) => a.toLowerCase().includes(q)),
  );
}
