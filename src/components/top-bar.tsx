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
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-primary">
          <img src="/logo.svg" alt="Saving Money" className="h-7 w-7" />
          <span>Saving Money</span>
        </Link>

        <nav className="hidden desktop:flex items-center gap-2 text-sm">
          <Link href="/dashboard" className="px-3 py-2 hover:text-primary">Tổng quan</Link>
          <Link href="/history" className="px-3 py-2 hover:text-primary">Lịch sử</Link>
          <Link href="/savings" className="px-3 py-2 hover:text-primary">Tiết kiệm</Link>
          <Link href="/reports" className="px-3 py-2 hover:text-primary">Báo cáo</Link>
          <Link href="/add" className="btn-primary !py-1.5 !px-3">+ Thêm</Link>
        </nav>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen((o) => !o)}
            className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold"
            aria-label="Tài khoản"
            aria-haspopup="menu"
            aria-expanded={open}
          >
            {initial}
          </button>
          {open && (
            <div
              role="menu"
              className="absolute right-0 top-11 w-56 bg-white rounded-xl shadow-lg border py-1 text-sm"
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
