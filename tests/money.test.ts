import { describe, it, expect } from "vitest";
import { splitEqual, splitEqualForPayer, sumMoney, validateSplitCustom, formatVND } from "@/lib/money";

describe("splitEqual", () => {
  it("chia đều không dư", () => {
    const r = splitEqual(900, 3);
    expect(r.map((d) => d.toString())).toEqual(["300", "300", "300"]);
  });

  it("chia đều có dư, phần dư cộng vào người đầu tiên", () => {
    const r = splitEqual(1_000_001, 3);
    expect(r.map((d) => d.toString())).toEqual(["333335", "333333", "333333"]);
    expect(sumMoney(r.map((d) => d.toString())).toString()).toBe("1000001");
  });

  it("ném lỗi khi n <= 0", () => {
    expect(() => splitEqual(100, 0)).toThrow();
  });
});

describe("validateSplitCustom", () => {
  it("đúng khi tổng = amount", () => {
    expect(validateSplitCustom(1000, [400, 600])).toBe(true);
  });
  it("sai khi tổng ≠ amount", () => {
    expect(validateSplitCustom(1000, [400, 500])).toBe(false);
  });
});

describe("formatVND", () => {
  it("format số tiền VND", () => {
    expect(formatVND(1_234_567)).toContain("1.234.567");
  });
});

describe("splitEqualForPayer", () => {
  it("A trả 2tr share đều với B → B nợ A 1tr (payer giữ 1tr residual)", () => {
    const shares = splitEqualForPayer(2_000_000, "A", ["B"]);
    expect(shares).toEqual([{ memberId: "B", amount: "1000000" }]);
  });

  it("A trả 1.000.001 share với B,C → B & C đều nợ 333.333 (A residual 333.335)", () => {
    const shares = splitEqualForPayer(1_000_001, "A", ["B", "C"]);
    expect(shares).toEqual([
      { memberId: "B", amount: "333333" },
      { memberId: "C", amount: "333333" },
    ]);
    const sumShares = sumMoney(shares.map((s) => s.amount));
    expect(sumShares.toString()).toBe("666666"); // 1.000.001 - 333.335 (residual của A) = 666.666
  });

  it("payer cũng trong sharedIds (input dư) → vẫn dedupe đúng", () => {
    const shares = splitEqualForPayer(2_000_000, "A", ["A", "B"]);
    expect(shares).toEqual([{ memberId: "B", amount: "1000000" }]);
  });

  it("không có ai khác ngoài payer → trả mảng rỗng", () => {
    expect(splitEqualForPayer(1_000_000, "A", [])).toEqual([]);
    expect(splitEqualForPayer(1_000_000, "A", ["A"])).toEqual([]);
  });
});
