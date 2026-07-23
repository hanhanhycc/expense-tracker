import { describe, expect, it } from "vitest";
import { buildWithdrawalSettlement, contributedByMember } from "@/features/savings/server/settlement";

describe("contributedByMember", () => {
  it("gộp nhiều lượt góp của cùng 1 member", () => {
    expect(
      contributedByMember([
        { memberId: "B", amount: "100000" },
        { memberId: "B", amount: "250000" },
        { memberId: "A", amount: "50000" },
      ])
    ).toEqual([
      { memberId: "B", amount: "350000" },
      { memberId: "A", amount: "50000" },
    ]);
  });

  it("trừ dòng âm (đã rút 1 phần) và ẩn member có phần còn lại = 0", () => {
    expect(
      contributedByMember([
        { memberId: "A", amount: "2000000" },
        { memberId: "B", amount: "1000000" },
        { memberId: "A", amount: "-500000" },
        { memberId: "B", amount: "-1000000" },
      ])
    ).toEqual([{ memberId: "A", amount: "1500000" }]);
  });

  it("không có đóng góp → rỗng", () => {
    expect(contributedByMember([])).toEqual([]);
  });
});

describe("buildWithdrawalSettlement", () => {
  const contributions = [
    { memberId: "A", amount: "2000000" },
    { memberId: "B", amount: "1000000" },
    { memberId: "C", amount: "500000" },
  ];

  it("rút toàn bộ → isFull, payer không có share row (residual model)", () => {
    const r = buildWithdrawalSettlement(contributions, "A", [
      { memberId: "A", amount: "2000000" },
      { memberId: "B", amount: "1000000" },
      { memberId: "C", amount: "500000" },
    ]);
    if (!r.ok) throw new Error("expected ok");
    expect(r.total).toBe("3500000");
    expect(r.isFull).toBe(true);
    expect(r.shares).toEqual([
      { memberId: "B", amount: "1000000" },
      { memberId: "C", amount: "500000" },
    ]);
    // residual của payer = total - sum(shares) = đúng phần A rút
    const sumShares = r.shares.reduce((s, x) => s + Number(x.amount), 0);
    expect(Number(r.total) - sumShares).toBe(2000000);
  });

  it("rút 1 phần → isFull=false, withdrawalByMember đủ mọi người kể cả payer", () => {
    const r = buildWithdrawalSettlement(contributions, "A", [
      { memberId: "A", amount: "500000" },
      { memberId: "B", amount: "300000" },
    ]);
    if (!r.ok) throw new Error("expected ok");
    expect(r.total).toBe("800000");
    expect(r.isFull).toBe(false);
    expect(r.shares).toEqual([{ memberId: "B", amount: "300000" }]);
    expect(r.withdrawalByMember).toEqual([
      { memberId: "A", amount: "500000" },
      { memberId: "B", amount: "300000" },
    ]);
  });

  it("rút quá phần đã góp → EXCEEDS_CONTRIBUTED kèm memberId", () => {
    const r = buildWithdrawalSettlement(contributions, "A", [{ memberId: "B", amount: "1000001" }]);
    expect(r).toEqual({ ok: false, error: "EXCEEDS_CONTRIBUTED", memberId: "B" });
  });

  it("member chưa từng góp mà rút → EXCEEDS_CONTRIBUTED", () => {
    const r = buildWithdrawalSettlement(contributions, "A", [{ memberId: "X", amount: "1" }]);
    expect(r).toEqual({ ok: false, error: "EXCEEDS_CONTRIBUTED", memberId: "X" });
  });

  it("không rút đồng nào (rỗng hoặc toàn 0) → EMPTY", () => {
    expect(buildWithdrawalSettlement(contributions, "A", [])).toEqual({ ok: false, error: "EMPTY" });
    expect(buildWithdrawalSettlement(contributions, "A", [{ memberId: "B", amount: "0" }])).toEqual({
      ok: false,
      error: "EMPTY",
    });
  });

  it("tôn trọng dòng âm: chỉ được rút phần còn lại", () => {
    const withNegative = [...contributions, { memberId: "B", amount: "-800000" }];
    // B chỉ còn 200000
    expect(buildWithdrawalSettlement(withNegative, "A", [{ memberId: "B", amount: "200001" }])).toEqual({
      ok: false,
      error: "EXCEEDS_CONTRIBUTED",
      memberId: "B",
    });
    const ok = buildWithdrawalSettlement(withNegative, "A", [{ memberId: "B", amount: "200000" }]);
    if (!ok.ok) throw new Error("expected ok");
    expect(ok.total).toBe("200000");
    expect(ok.isFull).toBe(false);
  });

  it("rút sạch phần còn lại sau khi đã rút 1 phần trước đó → isFull", () => {
    const withNegative = [
      { memberId: "A", amount: "2000000" },
      { memberId: "A", amount: "-1500000" },
      { memberId: "B", amount: "1000000" },
    ];
    const r = buildWithdrawalSettlement(withNegative, "A", [
      { memberId: "A", amount: "500000" },
      { memberId: "B", amount: "1000000" },
    ]);
    if (!r.ok) throw new Error("expected ok");
    expect(r.isFull).toBe(true);
    expect(r.total).toBe("1500000");
  });

  it("gộp nhiều dòng rút của cùng member + cộng Decimal chính xác với number input", () => {
    const r = buildWithdrawalSettlement(contributions, "A", [
      { memberId: "A", amount: 1000001 },
      { memberId: "A", amount: 999999 },
    ]);
    if (!r.ok) throw new Error("expected ok");
    expect(r.total).toBe("2000000");
    expect(r.withdrawalByMember).toEqual([{ memberId: "A", amount: "2000000" }]);
    expect(r.shares).toEqual([]);
  });
});
