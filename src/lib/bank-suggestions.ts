// Gợi ý icon + màu cho một số ngân hàng / ví điện tử phổ biến ở VN.
// Dùng ở form thêm/sửa tài khoản.

export type BankSuggestion = {
  pattern: RegExp;
  icon: string;
  color?: string;
  label?: string;
};

export const BANK_SUGGESTIONS: BankSuggestion[] = [
  // Vietcombank — xanh lá
  { pattern: /\b(vietcombank|vcb)\b/i, icon: "🟢", color: "#007F3E", label: "Vietcombank" },
  // HSBC — đỏ
  { pattern: /\bhsbc\b/i, icon: "🟥", color: "#DB0011", label: "HSBC" },
  // TPBank — tím
  { pattern: /\btp\s*bank\b/i, icon: "🟣", color: "#7B2CBF", label: "TPBank" },
  // LioBank — sư tử
  { pattern: /\blio\s*bank\b/i, icon: "🦁", color: "#F9A825", label: "LioBank" },
  // Cake (by VPBank) — bánh kem
  { pattern: /\bcake\b/i, icon: "🍰", color: "#FF4D8D", label: "Cake by VPBank" },
  // Techcombank — đỏ
  { pattern: /\b(techcombank|tcb)\b/i, icon: "🔴", color: "#E30613", label: "Techcombank" },
  // BIDV — xanh navy
  { pattern: /\bbidv\b/i, icon: "🔵", color: "#0D3B66", label: "BIDV" },
  // VietinBank — xanh dương
  { pattern: /\b(vietinbank|ctg)\b/i, icon: "🔷", color: "#1B4079", label: "VietinBank" },
  // Agribank — nâu vàng
  { pattern: /\bagribank\b/i, icon: "🌾", color: "#A2461E", label: "Agribank" },
  // MB Bank — đỏ
  { pattern: /\b(mb\s*bank|mbbank|mb)\b/i, icon: "🔴", color: "#C8102E", label: "MB Bank" },
  // ACB — xanh navy
  { pattern: /\bacb\b/i, icon: "🔷", color: "#0066B3", label: "ACB" },
  // VPBank — xanh lá
  { pattern: /\bvpbank\b/i, icon: "🟢", color: "#00A859", label: "VPBank" },
  // Sacombank — xanh navy
  { pattern: /\bsacombank\b/i, icon: "🔷", color: "#0072BC", label: "Sacombank" },
  // SHB — xanh dương
  { pattern: /\bshb\b/i, icon: "🔷", color: "#005EB8", label: "SHB" },
  // Eximbank — xanh
  { pattern: /\beximbank\b/i, icon: "🔷", color: "#003DA5", label: "Eximbank" },
  // Momo — hồng đậm
  { pattern: /\bmomo\b/i, icon: "💗", color: "#A50064", label: "Momo" },
  // ZaloPay — xanh dương
  { pattern: /\bzalo\s*pay\b/i, icon: "💠", color: "#0068FF", label: "ZaloPay" },
  // ShopeePay — cam Shopee
  { pattern: /\bshopee\s*pay\b|\bshopee\b/i, icon: "🛍️", color: "#EE4D2D", label: "ShopeePay" },
  // VNPay — xanh
  { pattern: /\bvnpay\b/i, icon: "🔷", color: "#005AAB", label: "VNPay" },
  // Apple Pay — đen
  { pattern: /\bapple\s*pay\b/i, icon: "🍎", color: "#000000", label: "Apple Pay" },
  // Google Pay
  { pattern: /\bgoogle\s*pay\b/i, icon: "🟢", color: "#4285F4", label: "Google Pay" },
  // Visa / Mastercard chung
  { pattern: /\bvisa\b/i, icon: "💳", color: "#1A1F71", label: "Visa" },
  { pattern: /\bmastercard\b/i, icon: "💳", color: "#EB001B", label: "Mastercard" },
];

/** Tìm gợi ý icon/màu dựa trên tên tài khoản. Trả null nếu không khớp. */
export function suggestBankFromName(name: string): BankSuggestion | null {
  const n = name.trim();
  if (!n) return null;
  for (const s of BANK_SUGGESTIONS) {
    if (s.pattern.test(n)) return s;
  }
  return null;
}
