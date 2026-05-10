import { describe, it, expect } from "vitest";
import { splitEqual, sumMoney, validateSplitCustom, formatVND } from "@/lib/money";

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
