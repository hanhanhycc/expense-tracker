// Badge thương hiệu cho tài khoản — màu nền chính thức + chữ viết tắt.
// Tránh vi phạm bản quyền bằng cách KHÔNG reproduce logo, chỉ dùng màu + initials.

export type BrandBadge = {
  /** Regex match tên account (case-insensitive) */
  pattern: RegExp;
  /** Tên hiển thị gợi ý (chỉ để log/tooltip) */
  label: string;
  /** Màu nền chính (hex) */
  bg: string;
  /** Màu chữ (hex). Mặc định trắng. */
  fg?: string;
  /** Chữ viết tắt hiển thị, tối đa 4 ký tự. */
  short: string;
};

export const BRAND_BADGES: BrandBadge[] = [
  // ─── Ngân hàng VN ───
  { pattern: /\b(vietcombank|vcb)\b/i, label: "Vietcombank", bg: "#007F3E", short: "VCB" },
  { pattern: /\b(techcombank|tcb)\b/i, label: "Techcombank", bg: "#E30613", short: "TCB" },
  { pattern: /\b(tp\s*bank|tpbank)\b/i, label: "TPBank", bg: "#7B2CBF", short: "TPB" },
  { pattern: /\b(lio\s*bank|liobank)\b/i, label: "LioBank", bg: "#F9A825", fg: "#1A1A1A", short: "Lio" },
  { pattern: /\bcake\b/i, label: "Cake by VPBank", bg: "#FF4D8D", short: "Cake" },
  { pattern: /\bvpbank\b/i, label: "VPBank", bg: "#00A859", short: "VPB" },
  { pattern: /\bbidv\b/i, label: "BIDV", bg: "#0D3B66", short: "BIDV" },
  { pattern: /\b(vietinbank|ctg)\b/i, label: "VietinBank", bg: "#1B4079", short: "CTG" },
  { pattern: /\bagribank\b/i, label: "Agribank", bg: "#A2461E", short: "AGRI" },
  { pattern: /\b(mb\s*bank|mbbank|mb)\b/i, label: "MB Bank", bg: "#C8102E", short: "MB" },
  { pattern: /\bacb\b/i, label: "ACB", bg: "#0066B3", short: "ACB" },
  { pattern: /\bsacombank\b/i, label: "Sacombank", bg: "#0072BC", short: "STB" },
  { pattern: /\bshb\b/i, label: "SHB", bg: "#005EB8", short: "SHB" },
  { pattern: /\beximbank\b/i, label: "Eximbank", bg: "#003DA5", short: "EIB" },
  { pattern: /\b(hd\s*bank|hdbank)\b/i, label: "HDBank", bg: "#E30613", short: "HDB" },
  { pattern: /\b(ocb)\b/i, label: "OCB", bg: "#16A34A", short: "OCB" },
  { pattern: /\b(vib)\b/i, label: "VIB", bg: "#1E40AF", short: "VIB" },
  { pattern: /\b(scb)\b/i, label: "SCB", bg: "#1D4ED8", short: "SCB" },
  { pattern: /\b(msb|maritime)\b/i, label: "MSB", bg: "#DC2626", short: "MSB" },
  { pattern: /\b(seabank|sea\s*bank)\b/i, label: "SeABank", bg: "#7C3AED", short: "Sea" },

  // ─── Ngân hàng quốc tế tại VN ───
  { pattern: /\bhsbc\b/i, label: "HSBC", bg: "#DB0011", short: "HSBC" },
  { pattern: /\b(standard\s*chartered|scb)\b/i, label: "Standard Chartered", bg: "#0473EA", short: "SC" },
  { pattern: /\bcitibank\b/i, label: "Citibank", bg: "#003B70", short: "Citi" },
  { pattern: /\b(uob)\b/i, label: "UOB", bg: "#003DA5", short: "UOB" },
  { pattern: /\b(shinhan)\b/i, label: "Shinhan", bg: "#0046A6", short: "SHN" },
  { pattern: /\b(woori)\b/i, label: "Woori", bg: "#005BAC", short: "Woori" },
  { pattern: /\b(public\s*bank)\b/i, label: "Public Bank", bg: "#006B3F", short: "PBVN" },

  // ─── Ví điện tử ───
  { pattern: /\bmomo\b/i, label: "MoMo", bg: "#A50064", short: "Momo" },
  { pattern: /\b(zalo\s*pay|zalopay)\b/i, label: "ZaloPay", bg: "#0068FF", short: "Zalo" },
  { pattern: /\b(shopee\s*pay|shopeepay|shopee)\b/i, label: "ShopeePay", bg: "#EE4D2D", short: "SPay" },
  { pattern: /\b(viettel\s*pay|viettelpay|viettel\s*money)\b/i, label: "Viettel Money", bg: "#EE0033", short: "VTL" },
  { pattern: /\b(vn\s*pay|vnpay)\b/i, label: "VNPay", bg: "#005AAB", short: "VNP" },
  { pattern: /\b(grab\s*pay|grabpay)\b/i, label: "GrabPay", bg: "#00B14F", short: "Grab" },

  // ─── Thẻ / Khác ───
  { pattern: /\b(apple\s*pay)\b/i, label: "Apple Pay", bg: "#000000", short: "Pay" },
  { pattern: /\b(google\s*pay|g\s*pay)\b/i, label: "Google Pay", bg: "#4285F4", short: "GPay" },
  { pattern: /\bvisa\b/i, label: "Visa", bg: "#1A1F71", short: "VISA" },
  { pattern: /\bmastercard\b/i, label: "Mastercard", bg: "#EB001B", short: "MC" },
  { pattern: /\b(jcb)\b/i, label: "JCB", bg: "#003B7A", short: "JCB" },
  { pattern: /\b(amex|american\s*express)\b/i, label: "Amex", bg: "#2E77BC", short: "Amex" },
  { pattern: /\b(napas)\b/i, label: "NAPAS", bg: "#E30613", short: "NPS" },
];

/** Tìm badge khớp với tên tài khoản. */
export function findBrandBadge(name: string): BrandBadge | null {
  const n = name.trim();
  if (!n) return null;
  for (const b of BRAND_BADGES) if (b.pattern.test(n)) return b;
  return null;
}
