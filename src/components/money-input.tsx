"use client";

import { forwardRef } from "react";
import { formatNumber } from "@/lib/money";

type Props = {
  value: string;
  onValueChange: (raw: string) => void;
  suffix?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">;

/**
 * Input tiền VND: tự thêm dấu chấm phân cách hàng nghìn khi gõ.
 * `value` luôn là chuỗi số nguyên thuần (không có dấu).
 */
export const MoneyInput = forwardRef<HTMLInputElement, Props>(function MoneyInput(
  { value, onValueChange, suffix = "₫", className, ...rest },
  ref,
) {
  const display = value ? `${formatNumber(value)} ${suffix}`.trim() : "";
  return (
    <input
      {...rest}
      ref={ref}
      className={className}
      inputMode="numeric"
      autoComplete="off"
      value={display}
      onChange={(e) => {
        const cleaned = e.target.value.replace(/\D/g, "");
        onValueChange(cleaned);
      }}
    />
  );
});
