"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const items = [
  { href: "/dashboard", label: "Tổng quan", icon: "🏠" },
  { href: "/history", label: "Lịch sử", icon: "📋" },
  { href: "/add", label: "+", icon: "" },
  { href: "/savings", label: "Tiết kiệm", icon: "🎯" },
  { href: "/reports", label: "Báo cáo", icon: "📊" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-3 inset-x-3 z-30 glass-strong rounded-2xl desktop:hidden">
      <ul className="grid grid-cols-5 h-16">
        {items.map((it) => {
          const active = pathname.startsWith(it.href);
          if (it.href === "/add") {
            return (
              <li key={it.href} className="flex items-center justify-center -mt-7">
                <Link
                  href="/add"
                  className="w-14 h-14 rounded-full bg-primary text-white text-3xl flex items-center justify-center shadow-[0_8px_24px_rgba(239,90,90,0.45)]"
                  aria-label="Thêm giao dịch"
                >
                  +
                </Link>
              </li>
            );
          }
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                className={clsx(
                  "h-full flex flex-col items-center justify-center gap-0.5 text-xs transition relative",
                  active ? "text-primary font-semibold" : "text-gray-500 hover:text-gray-800"
                )}
              >
                {active && (
                  <span className="absolute top-1.5 w-8 h-1 rounded-full bg-primary" />
                )}
                <span className="text-lg mt-1">{it.icon}</span>
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
