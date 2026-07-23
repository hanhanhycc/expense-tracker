import Decimal from "decimal.js";

// Tiền Decimal(18,2): phép chia pro-rata cần precision cao hơn mặc định (20)
// để nhân/chia số lớn không mất chính xác.
Decimal.set({ precision: 50 });

export type Money = Decimal | number | string;

export function toDecimal(v: Money): Decimal {
  return new Decimal(v ?? 0);
}

export function sumMoney(items: Money[]): Decimal {
  return items.reduce<Decimal>((s, i) => s.plus(toDecimal(i)), new Decimal(0));
}

const VND = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const NUM = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

export function formatVND(v: Money): string {
  return VND.format(toDecimal(v).toNumber());
}

export function formatNumber(v: Money): string {
  return NUM.format(toDecimal(v).toNumber());
}

export function parseMoneyInput(s: string): Decimal {
  const cleaned = (s ?? "").replace(/[^\d-]/g, "");
  if (!cleaned) return new Decimal(0);
  return new Decimal(cleaned);
}

/**
 * Chia đều `amount` cho `n` người. Phần dư cộng vào người ĐẦU TIÊN.
 * Ví dụ: 1.000.001 / 3 → [333335, 333333, 333333]
 */
export function splitEqual(amount: Money, n: number): Decimal[] {
  if (n <= 0) throw new Error("Số người chia phải > 0");
  const total = toDecimal(amount);
  const each = total.div(n).floor();
  const remainder = total.minus(each.times(n));
  return Array.from({ length: n }, (_, i) => (i === 0 ? each.plus(remainder) : each));
}

/**
 * Validate split custom: tổng các phần phải = amount.
 */
export function validateSplitCustom(amount: Money, parts: Money[]): boolean {
  return sumMoney(parts).equals(toDecimal(amount));
}

/**
 * Chia đều amount cho `payerId + sharedIds` (dedupe). Trả về danh sách share
 * cho các thành viên KHÔNG phải payer; payer giữ phần dư (residual).
 *
 * VD: A trả 2.000.000 share với B → [{B: 1.000.000}], A giữ 1.000.000 (residual).
 * VD: 1.000.001 trả bởi A, share với B,C → [{B: 333.333}, {C: 333.333}], A giữ 333.335.
 */
export function splitEqualForPayer(
  amount: Money,
  payerId: string,
  sharedIds: string[],
): { memberId: string; amount: string }[] {
  const participants = Array.from(new Set([payerId, ...sharedIds]));
  if (participants.length <= 1) return [];
  const parts = splitEqual(amount, participants.length);
  const nonPayers = participants.filter((p) => p !== payerId);
  // parts[0] luôn là phần của payer (chứa phần dư). Non-payer nhận parts[1..].
  return nonPayers.map((mid, i) => ({ memberId: mid, amount: parts[i + 1].toString() }));
}
