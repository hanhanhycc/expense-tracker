"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useRef, useState } from "react";
import { useClickOutside } from "@/lib/use-click-outside";

export function TopBar() {
  const { data } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const name = data?.user?.name || "Bạn";
  const initial = name.charAt(0).toUpperCase();

  useClickOutside({ enabled: open, onClose: () => setOpen(false), ref: menuRef });

  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-rose-100">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-primary-700">
          <img src="/logo.svg" alt="Saving Money" className="h-9 w-9 rounded-xl" />
          <span className="text-lg tracking-tight">Saving Money</span>
        </Link>

        <nav className="hidden desktop:flex items-center gap-1 text-sm">
          <NavLink href="/dashboard">Tổng quan</NavLink>
          <NavLink href="/history">Lịch sử</NavLink>
          <NavLink href="/savings">Tiết kiệm</NavLink>
          <NavLink href="/reports">Báo cáo</NavLink>
          <Link href="/add" className="btn-primary !py-2 !px-4 ml-2">+ Thêm</Link>
        </nav>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen((o) => !o)}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-700 text-white font-bold shadow-[0_6px_16px_rgba(247,131,168,0.4)]"
            aria-label="Tài khoản"
            aria-haspopup="menu"
            aria-expanded={open}
          >
            {initial}
          </button>
          {open && (
            <div
              role="menu"
              className="absolute right-0 top-11 w-56 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-gray-100 py-1 text-sm overflow-hidden"
            >
              <div className="px-3 py-2 border-b text-gray-500 text-xs">{data?.user?.email}</div>
              <Link href="/settings" className="block px-3 py-2 hover:bg-gray-50" onClick={() => setOpen(false)}>⚙️ Cài đặt</Link>
              <Link href="/settings/profile" className="block px-3 py-2 hover:bg-gray-50" onClick={() => setOpen(false)}>👤 Thông tin cá nhân</Link>
              <Link href="/settings/members" className="block px-3 py-2 hover:bg-gray-50" onClick={() => setOpen(false)}>👥 Thành viên</Link>
              <Link href="/settings/categories" className="block px-3 py-2 hover:bg-gray-50" onClick={() => setOpen(false)}>🏷 Danh mục</Link>
              <button
                onClick={() => { setOpen(false); signOut({ callbackUrl: "/login" }); }}
                className="block w-full text-left px-3 py-2 hover:bg-gray-50 text-danger"
              >
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="px-3 py-2 rounded-full text-gray-600 hover:text-primary-700 hover:bg-rose-50 transition">
      {children}
    </Link>
  );
}
