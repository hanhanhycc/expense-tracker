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
  // Không render suffix vào value để backspace xoá số mượt (tránh kẹt ở ký hiệu tiền tệ).
  const display = value ? formatNumber(value) : "";
  return (
    <input
      {...rest}
      ref={ref}
      className={className}
      inputMode="numeric"
      autoComplete="off"
      aria-label={rest["aria-label"] ?? `Số tiền (${suffix})`}
      value={display}
      onChange={(e) => {
        const cleaned = e.target.value.replace(/\D/g, "");
        onValueChange(cleaned);
      }}
    />
  );
});
