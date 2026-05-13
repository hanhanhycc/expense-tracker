// Danh sách ngân hàng VN từ VietQR (https://api.vietqr.io/v2/banks).
// Logo URL: https://cdn.vietqr.io/img/<code>.png  (cdn công khai, dùng cho fintech app).
// Cập nhật: 05/2026 — 65 ngân hàng.

import type { AccountType } from "@prisma/client";

export type VietQRBank = {
  code: string;       // VietQR code (VCB, MB, TPB...)
  shortName: string;  // Tên ngắn hiển thị (Vietcombank, MBBank...)
  name: string;       // Tên đầy đủ
  bin: string;        // BIN number
  type: AccountType;  // Phân loại (BANK / EWALLET)
};

export const VIETQR_BANKS: VietQRBank[] = [
  { code: "ICB", shortName: "VietinBank", name: "Ngân hàng TMCP Công thương Việt Nam", bin: "970415", type: "BANK" },
  { code: "VCB", shortName: "Vietcombank", name: "Ngân hàng TMCP Ngoại Thương Việt Nam", bin: "970436", type: "BANK" },
  { code: "BIDV", shortName: "BIDV", name: "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam", bin: "970418", type: "BANK" },
  { code: "VBA", shortName: "Agribank", name: "Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam", bin: "970405", type: "BANK" },
  { code: "OCB", shortName: "OCB", name: "Ngân hàng TMCP Phương Đông", bin: "970448", type: "BANK" },
  { code: "MB", shortName: "MBBank", name: "Ngân hàng TMCP Quân đội", bin: "970422", type: "BANK" },
  { code: "TCB", shortName: "Techcombank", name: "Ngân hàng TMCP Kỹ thương Việt Nam", bin: "970407", type: "BANK" },
  { code: "ACB", shortName: "ACB", name: "Ngân hàng TMCP Á Châu", bin: "970416", type: "BANK" },
  { code: "VPB", shortName: "VPBank", name: "Ngân hàng TMCP Việt Nam Thịnh Vượng", bin: "970432", type: "BANK" },
  { code: "TPB", shortName: "TPBank", name: "Ngân hàng TMCP Tiên Phong", bin: "970423", type: "BANK" },
  { code: "STB", shortName: "Sacombank", name: "Ngân hàng TMCP Sài Gòn Thương Tín", bin: "970403", type: "BANK" },
  { code: "HDB", shortName: "HDBank", name: "Ngân hàng TMCP Phát triển Thành phố Hồ Chí Minh", bin: "970437", type: "BANK" },
  { code: "VCCB", shortName: "VietCapitalBank", name: "Ngân hàng TMCP Bản Việt", bin: "970454", type: "BANK" },
  { code: "SCB", shortName: "SCB", name: "Ngân hàng TMCP Sài Gòn", bin: "970429", type: "BANK" },
  { code: "VIB", shortName: "VIB", name: "Ngân hàng TMCP Quốc tế Việt Nam", bin: "970441", type: "BANK" },
  { code: "SHB", shortName: "SHB", name: "Ngân hàng TMCP Sài Gòn - Hà Nội", bin: "970443", type: "BANK" },
  { code: "EIB", shortName: "Eximbank", name: "Ngân hàng TMCP Xuất Nhập khẩu Việt Nam", bin: "970431", type: "BANK" },
  { code: "MSB", shortName: "MSB", name: "Ngân hàng TMCP Hàng Hải Việt Nam", bin: "970426", type: "BANK" },
  { code: "CAKE", shortName: "Cake by VPBank", name: "Ngân hàng số CAKE by VPBank", bin: "546034", type: "BANK" },
  { code: "UBANK", shortName: "Ubank by VPBank", name: "Ngân hàng số Ubank by VPBank", bin: "546035", type: "BANK" },
  { code: "VIETTELMONEY", shortName: "Viettel Money", name: "Viettel Money", bin: "971005", type: "EWALLET" },
  { code: "VNPTMONEY", shortName: "VNPT Money", name: "VNPT Money", bin: "971011", type: "EWALLET" },
  { code: "SGICB", shortName: "SaigonBank", name: "Ngân hàng TMCP Sài Gòn Công Thương", bin: "970400", type: "BANK" },
  { code: "BAB", shortName: "BacABank", name: "Ngân hàng TMCP Bắc Á", bin: "970409", type: "BANK" },
  { code: "PVCB", shortName: "PVcomBank", name: "Ngân hàng TMCP Đại Chúng Việt Nam", bin: "970412", type: "BANK" },
  { code: "MBV", shortName: "MBV", name: "Ngân hàng TNHH MTV Việt Nam Hiện Đại", bin: "970414", type: "BANK" },
  { code: "NCB", shortName: "NCB", name: "Ngân hàng TMCP Quốc Dân", bin: "970419", type: "BANK" },
  { code: "SHBVN", shortName: "Shinhan Bank", name: "Ngân hàng TNHH MTV Shinhan Việt Nam", bin: "970424", type: "BANK" },
  { code: "ABB", shortName: "ABBANK", name: "Ngân hàng TMCP An Bình", bin: "970425", type: "BANK" },
  { code: "VAB", shortName: "VietABank", name: "Ngân hàng TMCP Việt Á", bin: "970427", type: "BANK" },
  { code: "NAB", shortName: "NamABank", name: "Ngân hàng TMCP Nam Á", bin: "970428", type: "BANK" },
  { code: "PGB", shortName: "PGBank", name: "Ngân hàng TMCP Thịnh vượng và Phát triển", bin: "970430", type: "BANK" },
  { code: "VIETBANK", shortName: "VietBank", name: "Ngân hàng TMCP Việt Nam Thương Tín", bin: "970433", type: "BANK" },
  { code: "BVB", shortName: "BaoVietBank", name: "Ngân hàng TMCP Bảo Việt", bin: "970438", type: "BANK" },
  { code: "SEAB", shortName: "SeABank", name: "Ngân hàng TMCP Đông Nam Á", bin: "970440", type: "BANK" },
  { code: "COOPBANK", shortName: "COOPBANK", name: "Ngân hàng Hợp tác xã Việt Nam", bin: "970446", type: "BANK" },
  { code: "LPB", shortName: "LPBank", name: "Ngân hàng TMCP Lộc Phát Việt Nam", bin: "970449", type: "BANK" },
  { code: "KLB", shortName: "KienLongBank", name: "Ngân hàng TMCP Kiên Long", bin: "970452", type: "BANK" },
  { code: "KBANK", shortName: "KBank", name: "Kasikornbank", bin: "668888", type: "BANK" },
  { code: "HLBVN", shortName: "Hong Leong", name: "Ngân hàng TNHH MTV Hong Leong Việt Nam", bin: "970442", type: "BANK" },
  { code: "HSBC", shortName: "HSBC", name: "Ngân hàng TNHH MTV HSBC (Việt Nam)", bin: "458761", type: "BANK" },
  { code: "IVB", shortName: "IndovinaBank", name: "Ngân hàng TNHH Indovina", bin: "970434", type: "BANK" },
  { code: "UOB", shortName: "UOB", name: "Ngân hàng United Overseas - Chi nhánh TP. Hồ Chí Minh", bin: "970458", type: "BANK" },
  { code: "SCVN", shortName: "Standard Chartered", name: "Ngân hàng TNHH MTV Standard Chartered Việt Nam", bin: "970410", type: "BANK" },
  { code: "PBVN", shortName: "Public Bank", name: "Ngân hàng TNHH MTV Public Việt Nam", bin: "970439", type: "BANK" },
  { code: "WVN", shortName: "Woori", name: "Ngân hàng TNHH MTV Woori Việt Nam", bin: "970457", type: "BANK" },
  { code: "CITIBANK", shortName: "Citibank", name: "Ngân hàng Citibank - Chi nhánh Hà Nội", bin: "533948", type: "BANK" },
  { code: "TIMO", shortName: "Timo", name: "Ngân hàng số Timo by Ban Viet Bank", bin: "963388", type: "BANK" },
  { code: "Vikki", shortName: "Vikki", name: "Ngân hàng TNHH MTV Số Vikki", bin: "970406", type: "BANK" },
  { code: "momo", shortName: "MoMo", name: "CTCP Dịch Vụ Di Động Trực Tuyến (MoMo)", bin: "971025", type: "EWALLET" },
];

/** URL logo từ VietQR CDN. */
export function logoUrlFor(code: string): string {
  return `https://cdn.vietqr.io/img/${code}.png`;
}

/** Tìm bank theo tên / alias (lowercase compare). */
export function findVietQRBank(name: string): VietQRBank | null {
  const n = name.trim().toLowerCase();
  if (!n) return null;
  // Match shortName trước
  let best = VIETQR_BANKS.find((b) => b.shortName.toLowerCase() === n);
  if (best) return best;
  // Match code
  best = VIETQR_BANKS.find((b) => b.code.toLowerCase() === n);
  if (best) return best;
  // Match contained in shortName
  best = VIETQR_BANKS.find((b) => b.shortName.toLowerCase().includes(n) || n.includes(b.shortName.toLowerCase()));
  if (best) return best;
  return null;
}

/** Search filter cho picker UI. */
export function searchVietQRBanks(query: string): VietQRBank[] {
  const q = query.trim().toLowerCase();
  if (!q) return VIETQR_BANKS;
  return VIETQR_BANKS.filter(
    (b) =>
      b.shortName.toLowerCase().includes(q) ||
      b.name.toLowerCase().includes(q) ||
      b.code.toLowerCase().includes(q),
  );
}
