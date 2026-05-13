"use client";

import { useState } from "react";
import { findBrandBadge } from "@/lib/brand-badges";
import { findVietQRBank, logoUrlFor } from "@/lib/vietqr-banks";

/**
 * Badge tròn cho tài khoản:
 * 1. Có `bankCode` (chính xác nhất) → render logo từ cdn.vietqr.io.
 * 2. Tên khớp catalog VietQR → render logo CDN.
 * 3. Tên khớp brand badge (Visa/Apple Pay/…) → màu + chữ viết tắt.
 * 4. Fallback emoji icon.
 */
export function AccountBadge({
  name,
  icon,
  color,
  bankCode,
  size = 40,
}: {
  name: string;
  icon?: string | null;
  color?: string | null;
  bankCode?: string | null;
  size?: number;
}) {
  const [logoFailed, setLogoFailed] = useState(false);

  const resolvedCode =
    bankCode && bankCode.trim() ? bankCode.trim() : findVietQRBank(name)?.code ?? null;

  if (resolvedCode && !logoFailed) {
    return (
      <span
        className="inline-flex items-center justify-center rounded-full shrink-0 overflow-hidden bg-white border border-gray-200"
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrlFor(resolvedCode)}
          alt={name}
          width={size}
          height={size}
          loading="lazy"
          onError={() => setLogoFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </span>
    );
  }

  const brand = findBrandBadge(name);
  if (brand) {
    const fontSize = Math.round(size * 0.4);
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
