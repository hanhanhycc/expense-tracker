import { sumMoney, toDecimal } from "@/lib/money";

export type SettlementShare = { memberId: string; amount: string };

/**
 * Gộp các lượt đóng góp theo member rồi build shares cho giao dịch thu nhập
 * khi tất toán, theo residual model (CLAUDE.md §6): payer KHÔNG có share row
 * riêng — payer giữ phần residual = tổng đóng góp của chính họ.
 *
 * VD: A góp 2tr, B góp 1tr, A tất toán → total = 3tr, shares = [{B: 1tr}],
 * A giữ residual 2tr.
 */
export function buildSettlementShares(
  contributions: { memberId: string; amount: string | number }[],
  payerId: string,
): { total: string; shares: SettlementShare[] } {
  const byMember = new Map<string, ReturnType<typeof toDecimal>>();
  for (const c of contributions) {
    const cur = byMember.get(c.memberId) ?? toDecimal(0);
    byMember.set(c.memberId, cur.plus(toDecimal(c.amount)));
  }

  const total = sumMoney(contributions.map((c) => c.amount));
  const shares: SettlementShare[] = [];
  for (const [memberId, amount] of byMember) {
    if (memberId === payerId) continue; // payer giữ residual
    if (amount.lessThanOrEqualTo(0)) continue;
    shares.push({ memberId, amount: amount.toString() });
  }
  return { total: total.toString(), shares };
}
