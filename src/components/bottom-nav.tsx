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
    <nav className="fixed bottom-0 inset-x-0 z-30 border-t bg-white desktop:hidden">
      <ul className="grid grid-cols-5 h-16">
        {items.map((it) => {
          const active = pathname.startsWith(it.href);
          if (it.href === "/add") {
            return (
              <li key={it.href} className="flex items-center justify-center -mt-6">
                <Link
                  href="/add"
                  className="w-14 h-14 rounded-full bg-primary text-white text-3xl flex items-center justify-center shadow-lg"
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
                  "h-full flex flex-col items-center justify-center gap-0.5 text-xs",
                  active ? "text-primary font-medium" : "text-gray-500"
                )}
              >
                <span className="text-lg">{it.icon}</span>
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
