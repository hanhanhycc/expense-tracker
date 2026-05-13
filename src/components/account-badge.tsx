"use client";

import { findBrandBadge } from "@/lib/brand-badges";

/**
 * Badge tròn cho tài khoản:
 * - Nếu tên khớp brand → màu thương hiệu + chữ viết tắt.
 * - Nếu không → fallback emoji icon (cash, bank, card...).
 */
export function AccountBadge({
  name,
  icon,
  color,
  size = 40,
}: {
  name: string;
  icon?: string | null;
  color?: string | null;
  size?: number;
}) {
  const brand = findBrandBadge(name);
  const fontSize = Math.round(size * 0.4);

  if (brand) {
    return (
      <span
        className="inline-flex items-center justify-center rounded-full font-bold shrink-0 select-none"
        style={{
          width: size,
          height: size,
          background: brand.bg,
          color: brand.fg ?? "#FFFFFF",
          fontSize,
          letterSpacing: "-0.02em",
        }}
        title={brand.label}
      >
        {brand.short}
      </span>
    );
  }

  const bg = color ? color + "22" : "#F3F4F6";
  return (
    <span
      className="inline-flex items-center justify-center rounded-full shrink-0"
      style={{ width: size, height: size, background: bg, fontSize: Math.round(size * 0.55) }}
    >
      {icon || "💼"}
    </span>
  );
}
