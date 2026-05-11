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
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 desktop:hidden">
      <ul className="flex items-center gap-1 px-2 h-16 rounded-full bg-gray-900 text-white shadow-[0_12px_40px_rgba(0,0,0,0.25)] border border-white/10">
        {items.map((it) => {
          const active = pathname.startsWith(it.href);
          if (it.href === "/add") {
            return (
              <li key={it.href} className="px-1">
                <Link
                  href="/add"
                  aria-label="Thêm giao dịch"
                  className="w-12 h-12 -mt-8 rounded-full flex items-center justify-center text-white text-2xl shadow-[0_10px_24px_rgba(247,131,168,0.55)]"
                  style={{ background: "linear-gradient(135deg,#F783A8,#E64980)" }}
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
                aria-label={it.label}
                className={clsx(
                  "w-12 h-12 rounded-full flex flex-col items-center justify-center text-[10px] gap-0.5 transition",
                  active ? "bg-white text-gray-900 font-semibold" : "text-white/70 hover:text-white"
                )}
              >
                <span className="text-lg leading-none">{it.icon}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
