import { describe, expect, it } from "vitest";
import { buildSettlementShares } from "@/features/savings/server/settlement";

describe("buildSettlementShares", () => {
  it("payer là người góp duy nhất → không có share, payer giữ toàn bộ (residual)", () => {
    const { total, shares } = buildSettlementShares([{ memberId: "A", amount: "2000000" }], "A");
    expect(total).toBe("2000000");
    expect(shares).toEqual([]);
  });

  it("nhiều người góp — payer không có share row, non-payer nhận đúng phần đã góp", () => {
    const { total, shares } = buildSettlementShares(
      [
        { memberId: "A", amount: "2000000" },
        { memberId: "B", amount: "1000000" },
        { memberId: "C", amount: "500000" },
      ],
      "A"
    );
    expect(total).toBe("3500000");
    expect(shares).toEqual([
      { memberId: "B", amount: "1000000" },
      { memberId: "C", amount: "500000" },
    ]);
    // residual của payer = total - sum(shares) = đúng phần A đã góp
    const sumShares = shares.reduce((s, x) => s + Number(x.amount), 0);
    expect(Number(total) - sumShares).toBe(2000000);
  });

  it("payer không góp đồng nào → sum(shares) = total, residual = 0", () => {
    const { total, shares } = buildSettlementShares(
      [
        { memberId: "B", amount: "300000" },
        { memberId: "C", amount: "700000" },
      ],
      "A"
    );
    expect(total).toBe("1000000");
    const sumShares = shares.reduce((s, x) => s + Number(x.amount), 0);
    expect(sumShares).toBe(1000000);
  });

  it("gộp nhiều lượt góp của cùng 1 member thành 1 share", () => {
    const { total, shares } = buildSettlementShares(
      [
        { memberId: "B", amount: "100000" },
        { memberId: "B", amount: "250000" },
        { memberId: "A", amount: "50000" },
      ],
      "A"
    );
    expect(total).toBe("400000");
    expect(shares).toEqual([{ memberId: "B", amount: "350000" }]);
  });

  it("không có đóng góp nào → total = 0, không share", () => {
    const { total, shares } = buildSettlementShares([], "A");
    expect(total).toBe("0");
    expect(shares).toEqual([]);
  });

  it("số tiền dạng number cũng được cộng chính xác bằng Decimal", () => {
    const { total } = buildSettlementShares(
      [
        { memberId: "A", amount: 1000001 },
        { memberId: "B", amount: 999999 },
      ],
      "A"
    );
    expect(total).toBe("2000000");
  });
});
