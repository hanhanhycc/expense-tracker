import Decimal from "decimal.js";

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
