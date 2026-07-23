import Decimal from "decimal.js";
import { toDecimal } from "@/lib/money";

export type SettlementShare = { memberId: string; amount: string };

/**
 * Gộp các lượt đóng góp (kể cả dòng âm do tất toán 1 phần) thành phần còn lại
 * của từng member. Chỉ trả member có phần còn lại > 0.
 */
export function contributedByMember(
  contributions: { memberId: string; amount: string | number }[],
): SettlementShare[] {
  const byMember = new Map<string, ReturnType<typeof toDecimal>>();
  for (const c of contributions) {
    const cur = byMember.get(c.memberId) ?? toDecimal(0);
    byMember.set(c.memberId, cur.plus(toDecimal(c.amount)));
  }
  const out: SettlementShare[] = [];
  for (const [memberId, amount] of byMember) {
    if (amount.greaterThan(0)) out.push({ memberId, amount: amount.toString() });
  }
  return out;
}

export type Settlement =
  | {
      ok: true;
      /** Tổng tiền rút = số tiền giao dịch thu nhập. */
      total: string;
      /** true nếu rút sạch toàn bộ phần còn lại → khoá sổ. */
      isFull: boolean;
      /** Share cho non-payer (residual model — payer không có row). */
      shares: SettlementShare[];
      /** Phần rút của TỪNG member (kể cả payer) — dùng ghi dòng đóng góp âm. */
      withdrawalByMember: SettlementShare[];
    }
  | { ok: false; error: "EXCEEDS_TOTAL" | "EMPTY" };

/**
 * Tất toán theo 1 số tiền tổng: chia pro-rata theo phần còn lại của từng người
 * đã góp (largest remainder — phần dư làm tròn dồn cho người có phần lẻ lớn
 * nhất, tie-break theo phần góp lớn hơn). Tổng các phần LUÔN = amount.
 */
export function buildSettlement(
  contributions: { memberId: string; amount: string | number }[],
  payerId: string,
  amount: string | number,
): Settlement {
  const remaining = contributedByMember(contributions);
  const grandTotal = remaining.reduce((s, c) => s.plus(toDecimal(c.amount)), toDecimal(0));
  const total = toDecimal(amount).floor();

  if (!total.greaterThan(0)) return { ok: false, error: "EMPTY" };
  if (total.greaterThan(grandTotal)) return { ok: false, error: "EXCEEDS_TOTAL" };

  // Pro-rata làm tròn xuống theo đồng, sau đó phân phối phần dư (largest remainder).
  const rows = remaining.map((c) => {
    const contributed = toDecimal(c.amount);
    const raw = total.times(contributed).div(grandTotal);
    return { memberId: c.memberId, contributed, part: raw.floor(), frac: raw.minus(raw.floor()) };
  });
  let leftover = total.minus(rows.reduce((s, r) => s.plus(r.part), toDecimal(0)));
  const order = [...rows].sort((a, b) => {
    const byFrac = b.frac.comparedTo(a.frac);
    if (byFrac !== 0) return byFrac;
    return b.contributed.comparedTo(a.contributed);
  });
  for (const r of order) {
    if (!leftover.greaterThan(0)) break;
    const add = Decimal.min(leftover, r.contributed.minus(r.part));
    r.part = r.part.plus(add);
    leftover = leftover.minus(add);
  }

  const shares: SettlementShare[] = [];
  const withdrawalByMember: SettlementShare[] = [];
  for (const r of rows) {
    if (!r.part.greaterThan(0)) continue;
    withdrawalByMember.push({ memberId: r.memberId, amount: r.part.toString() });
    if (r.memberId !== payerId) shares.push({ memberId: r.memberId, amount: r.part.toString() });
  }
  return { ok: true, total: total.toString(), isFull: total.equals(grandTotal), shares, withdrawalByMember };
}
