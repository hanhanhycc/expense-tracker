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

export type WithdrawalSettlement =
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
  | { ok: false; error: "EXCEEDS_CONTRIBUTED" | "EMPTY"; memberId?: string };

/**
 * Tất toán theo số tiền tự nhập cho từng member.
 * Validate: phần rút mỗi người ≤ phần còn lại họ đã góp; tổng > 0.
 */
export function buildWithdrawalSettlement(
  contributions: { memberId: string; amount: string | number }[],
  payerId: string,
  withdrawals: { memberId: string; amount: string | number }[],
): WithdrawalSettlement {
  const contributed = new Map(contributedByMember(contributions).map((c) => [c.memberId, toDecimal(c.amount)]));

  const wanted = new Map<string, ReturnType<typeof toDecimal>>();
  for (const w of withdrawals) {
    const amt = toDecimal(w.amount);
    if (amt.lessThanOrEqualTo(0)) continue;
    const cur = wanted.get(w.memberId) ?? toDecimal(0);
    wanted.set(w.memberId, cur.plus(amt));
  }

  let total = toDecimal(0);
  for (const [memberId, amount] of wanted) {
    const max = contributed.get(memberId) ?? toDecimal(0);
    if (amount.greaterThan(max)) return { ok: false, error: "EXCEEDS_CONTRIBUTED", memberId };
    total = total.plus(amount);
  }
  if (!total.greaterThan(0)) return { ok: false, error: "EMPTY" };

  const grandTotal = Array.from(contributed.values()).reduce((s, x) => s.plus(x), toDecimal(0));
  const shares: SettlementShare[] = [];
  const withdrawalByMember: SettlementShare[] = [];
  for (const [memberId, amount] of wanted) {
    withdrawalByMember.push({ memberId, amount: amount.toString() });
    if (memberId !== payerId) shares.push({ memberId, amount: amount.toString() });
  }
  return { ok: true, total: total.toString(), isFull: total.equals(grandTotal), shares, withdrawalByMember };
}

