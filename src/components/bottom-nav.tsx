"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import clsx from "clsx";
import { haptic } from "@/lib/haptic";

const left = [
  { href: "/dashboard", label: "Tổng quan", Icon: HomeIcon },
  { href: "/history", label: "Lịch sử", Icon: ListIcon },
];
const right = [
  { href: "/savings", label: "Tiết kiệm", Icon: TargetIcon },
  { href: "/reports", label: "Báo cáo", Icon: ChartIcon },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-3 inset-x-3 z-30 desktop:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Bottom navigation"
    >
      <div className="dock relative rounded-[28px] h-[68px] flex items-center px-3 gap-1">
        <div className="flex-1 grid grid-cols-2 h-full">
          {left.map((it) => (
            <NavItem key={it.href} {...it} active={pathname.startsWith(it.href)} />
          ))}
        </div>

        <Link
          href="/add"
          aria-label="Thêm giao dịch"
          onClick={() => haptic("medium")}
          className="mx-1 -mt-7 w-14 h-14 rounded-2xl flex items-center justify-center text-white shrink-0 transition-transform active:scale-95"
          style={{
            background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))",
            boxShadow: "0 14px 32px -6px var(--accent-1), 0 0 0 4px var(--glass-bg-strong)",
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </Link>

        <div className="flex-1 grid grid-cols-2 h-full">
          {right.map((it) => (
            <NavItem key={it.href} {...it} active={pathname.startsWith(it.href)} />
          ))}
        </div>
      </div>
    </nav>
  );
}

function NavItem({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={clsx("dock-item touch-manipulation px-1", active && "dock-item-active")}
    >
      <Icon className={clsx("w-[22px] h-[22px]", active && "scale-110 transition")} />
      <span className={clsx("text-[10.5px] leading-none", active ? "font-bold" : "font-semibold")}>
        {label}
      </span>
    </Link>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12 12 4l9 8" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}
function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}
function TargetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </svg>
  );
}
function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M7 14l4-4 3 3 5-7" />
    </svg>
  );
}
