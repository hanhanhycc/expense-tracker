"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { haptic } from "@/lib/haptic";

const left = [
  { href: "/dashboard", label: "Tổng quan", icon: "🏠" },
  { href: "/history", label: "Lịch sử", icon: "📋" },
];
const right = [
  { href: "/savings", label: "Tiết kiệm", icon: "🎯" },
  { href: "/reports", label: "Báo cáo", icon: "📊" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-3 inset-x-3 z-30 desktop:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="relative bg-white rounded-3xl shadow-[0_12px_40px_rgba(231,72,128,0.18)] border border-rose-100 h-[68px] flex items-center px-2">
        <div className="flex-1 grid grid-cols-2">
          {left.map((it) => <NavItem key={it.href} {...it} active={pathname.startsWith(it.href)} />)}
        </div>

        <Link
          href="/add"
          aria-label="Thêm giao dịch"
          onClick={() => haptic("medium")}
          className="mx-2 -mt-7 w-14 h-14 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-[0_10px_28px_rgba(231,72,128,0.55)] shrink-0"
          style={{ background: "linear-gradient(135deg,#F783A8,#E64980)" }}
        >
          +
        </Link>

        <div className="flex-1 grid grid-cols-2">
          {right.map((it) => <NavItem key={it.href} {...it} active={pathname.startsWith(it.href)} />)}
        </div>
      </div>
    </nav>
  );
}

function NavItem({ href, icon, label, active }: { href: string; icon: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "h-full flex flex-col items-center justify-center gap-0.5 rounded-2xl transition",
        active ? "text-primary-700" : "text-gray-500 hover:text-gray-800"
      )}
    >
      <span className={clsx("text-xl leading-none", active && "scale-110 transition")}>{icon}</span>
      <span className={clsx("text-[11px]", active ? "font-bold" : "font-medium")}>{label}</span>
    </Link>
  );
}
