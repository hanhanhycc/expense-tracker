// Catalog các ngân hàng / ví VN — chọn nhanh khi tạo tài khoản mới.
// Mỗi entry liên kết với BRAND_BADGES qua `brandKey` (chính là `label` của BrandBadge)
// để dùng chung màu + chữ viết tắt.

import type { AccountType } from "@prisma/client";
import { findBrandBadge } from "./brand-badges";

export type BankCatalogItem = {
  /** Tên hiển thị mặc định khi user chọn */
  name: string;
  /** Loại tài khoản */
  type: AccountType;
  /** Bí danh để search (lowercase) */
  aliases: string[];
};

export const BANK_CATALOG: BankCatalogItem[] = [
  // ── Ngân hàng nội địa ──
  { name: "Vietcombank", type: "BANK", aliases: ["vcb", "ngoai thuong", "ngoại thương"] },
  { name: "Techcombank", type: "BANK", aliases: ["tcb"] },
  { name: "TPBank", type: "BANK", aliases: ["tp bank", "tien phong", "tiên phong"] },
  { name: "BIDV", type: "BANK", aliases: ["dau tu phat trien", "đầu tư phát triển"] },
  { name: "VietinBank", type: "BANK", aliases: ["ctg", "cong thuong", "công thương"] },
  { name: "Agribank", type: "BANK", aliases: ["nong nghiep", "nông nghiệp"] },
  { name: "MB Bank", type: "BANK", aliases: ["mbbank", "quan doi", "quân đội"] },
  { name: "ACB", type: "BANK", aliases: ["a chau", "á châu"] },
  { name: "VPBank", type: "BANK", aliases: ["vp bank", "viet nam thinh vuong"] },
  { name: "Sacombank", type: "BANK", aliases: ["stb", "sai gon thuong tin", "sài gòn thương tín"] },
  { name: "SHB", type: "BANK", aliases: ["sai gon ha noi", "sài gòn hà nội"] },
  { name: "Eximbank", type: "BANK", aliases: ["eib", "xuat nhap khau"] },
  { name: "HDBank", type: "BANK", aliases: ["hd bank", "phat trien tp hcm"] },
  { name: "OCB", type: "BANK", aliases: ["phuong dong", "phương đông"] },
  { name: "VIB", type: "BANK", aliases: ["quoc te", "quốc tế"] },
  { name: "SCB", type: "BANK", aliases: ["sai gon", "sài gòn"] },
  { name: "MSB", type: "BANK", aliases: ["maritime", "hang hai"] },
  { name: "SeABank", type: "BANK", aliases: ["sea bank", "dong nam a"] },
  { name: "LioBank", type: "BANK", aliases: ["lio"] },

  // ── Ngân hàng quốc tế tại VN ──
  { name: "HSBC", type: "BANK", aliases: ["hsbc viet nam"] },
  { name: "Standard Chartered", type: "BANK", aliases: ["sc"] },
  { name: "Citibank", type: "BANK", aliases: ["citi"] },
  { name: "UOB", type: "BANK", aliases: ["united overseas"] },
  { name: "Shinhan", type: "BANK", aliases: ["shinhan vn"] },
  { name: "Woori", type: "BANK", aliases: ["woori vn"] },
  { name: "Public Bank", type: "BANK", aliases: ["pbvn"] },

  // ── Ngân hàng số ──
  { name: "Cake by VPBank", type: "BANK", aliases: ["cake", "ngân hàng số"] },

  // ── Ví điện tử ──
  { name: "MoMo", type: "EWALLET", aliases: ["momo"] },
  { name: "ZaloPay", type: "EWALLET", aliases: ["zalo pay"] },
  { name: "ShopeePay", type: "EWALLET", aliases: ["shopee pay", "airpay"] },
  { name: "Viettel Money", type: "EWALLET", aliases: ["viettel pay", "vtm"] },
  { name: "VNPay", type: "EWALLET", aliases: ["vn pay"] },
  { name: "GrabPay", type: "EWALLET", aliases: ["grab pay"] },

  // ── Thẻ ──
  { name: "Visa", type: "CARD", aliases: [] },
  { name: "Mastercard", type: "CARD", aliases: ["master"] },
  { name: "JCB", type: "CARD", aliases: [] },
  { name: "American Express", type: "CARD", aliases: ["amex"] },
  { name: "Apple Pay", type: "CARD", aliases: ["apple"] },
  { name: "Google Pay", type: "CARD", aliases: ["gpay", "google"] },

  // ── Khác ──
  { name: "Tiền mặt", type: "CASH", aliases: ["cash", "tien mat"] },
];

/** Lọc catalog theo query (match name + aliases). */
export function searchBankCatalog(query: string): BankCatalogItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return BANK_CATALOG;
  return BANK_CATALOG.filter(
    (b) =>
      b.name.toLowerCase().includes(q) ||
      b.aliases.some((a) => a.toLowerCase().includes(q)),
  );
}

/** Lấy badge brand tương ứng (có màu + chữ viết tắt). */
export function getBadgeFor(item: BankCatalogItem) {
  return findBrandBadge(item.name);
}
