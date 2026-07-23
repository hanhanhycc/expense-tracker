import { describe, expect, it } from "vitest";
import { buildSettlement, contributedByMember } from "@/features/savings/server/settlement";

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

describe("buildSettlement (pro-rata)", () => {
  const contributions = [
    { memberId: "A", amount: "2000000" },
    { memberId: "B", amount: "1000000" },
    { memberId: "C", amount: "500000" },
  ];

  it("rút toàn bộ → isFull, chia đúng phần từng người, payer không có share row", () => {
    const r = buildSettlement(contributions, "A", "3500000");
    if (!r.ok) throw new Error("expected ok");
    expect(r.total).toBe("3500000");
    expect(r.isFull).toBe(true);
    expect(r.withdrawalByMember).toEqual([
      { memberId: "A", amount: "2000000" },
      { memberId: "B", amount: "1000000" },
      { memberId: "C", amount: "500000" },
    ]);
    expect(r.shares).toEqual([
      { memberId: "B", amount: "1000000" },
      { memberId: "C", amount: "500000" },
    ]);
    // residual của payer = total - sum(shares) = đúng phần A
    const sumShares = r.shares.reduce((s, x) => s + Number(x.amount), 0);
    expect(Number(r.total) - sumShares).toBe(2000000);
  });

  it("rút 1 phần → chia theo tỷ lệ phần đã góp, isFull=false", () => {
    // Rút 700.000 trên tổng 3.500.000 → tỷ lệ 1/5: A 400k, B 200k, C 100k
    const r = buildSettlement(contributions, "A", 700000);
    if (!r.ok) throw new Error("expected ok");
    expect(r.isFull).toBe(false);
    expect(r.withdrawalByMember).toEqual([
      { memberId: "A", amount: "400000" },
      { memberId: "B", amount: "200000" },
      { memberId: "C", amount: "100000" },
    ]);
    expect(r.shares).toEqual([
      { memberId: "B", amount: "200000" },
      { memberId: "C", amount: "100000" },
    ]);
  });

  it("tổng các phần LUÔN = amount kể cả khi chia có dư (largest remainder)", () => {
    // 100 chia tỷ lệ 1:1:1 trên 3 người góp đều → 34/33/33
    const even = [
      { memberId: "A", amount: "1000" },
      { memberId: "B", amount: "1000" },
      { memberId: "C", amount: "1000" },
    ];
    const r = buildSettlement(even, "A", 100);
    if (!r.ok) throw new Error("expected ok");
    const sum = r.withdrawalByMember.reduce((s, x) => s + Number(x.amount), 0);
    expect(sum).toBe(100);
    // không ai bị rút quá phần đã góp
    for (const w of r.withdrawalByMember) expect(Number(w.amount)).toBeLessThanOrEqual(1000);
  });

  it("payer không góp đồng nào → shares = toàn bộ, residual payer = 0", () => {
    const r = buildSettlement(contributions, "X", "3500000");
    if (!r.ok) throw new Error("expected ok");
    const sumShares = r.shares.reduce((s, x) => s + Number(x.amount), 0);
    expect(sumShares).toBe(3500000);
    expect(r.withdrawalByMember.length).toBe(3);
  });

  it("rút quá số dư sổ → EXCEEDS_TOTAL", () => {
    expect(buildSettlement(contributions, "A", "3500001")).toEqual({ ok: false, error: "EXCEEDS_TOTAL" });
  });

  it("không nhập tiền hoặc 0 → EMPTY", () => {
    expect(buildSettlement(contributions, "A", 0)).toEqual({ ok: false, error: "EMPTY" });
    expect(buildSettlement([], "A", 100)).toEqual({ ok: false, error: "EXCEEDS_TOTAL" });
  });

  it("tôn trọng dòng âm: số dư còn lại mới là mức tối đa", () => {
    const withNegative = [...contributions, { memberId: "B", amount: "-800000" }];
    // tổng còn lại = 2.700.000
    expect(buildSettlement(withNegative, "A", "2700001")).toEqual({ ok: false, error: "EXCEEDS_TOTAL" });
    const r = buildSettlement(withNegative, "A", "2700000");
    if (!r.ok) throw new Error("expected ok");
    expect(r.isFull).toBe(true);
    // B chỉ còn 200k → phần rút của B đúng 200k
    expect(r.withdrawalByMember.find((w) => w.memberId === "B")?.amount).toBe("200000");
  });

  it("rút sạch phần còn lại sau khi đã rút 1 phần trước đó → isFull", () => {
    const withNegative = [
      { memberId: "A", amount: "2000000" },
      { memberId: "A", amount: "-1500000" },
      { memberId: "B", amount: "1000000" },
    ];
    const r = buildSettlement(withNegative, "A", 1500000);
    if (!r.ok) throw new Error("expected ok");
    expect(r.isFull).toBe(true);
    expect(r.withdrawalByMember).toEqual([
      { memberId: "A", amount: "500000" },
      { memberId: "B", amount: "1000000" },
    ]);
  });

  it("số lớn vẫn chia chính xác bằng Decimal (không lệch 1 đồng)", () => {
    const big = [
      { memberId: "A", amount: "999999999999.99" },
      { memberId: "B", amount: "888888888888.88" },
    ];
    const r = buildSettlement(big, "A", "1000000000000");
    if (!r.ok) throw new Error("expected ok");
    const sum = r.withdrawalByMember.reduce((s, x) => Number(x.amount) + s, 0);
    expect(Math.round(sum)).toBe(1000000000000);
  });
});
