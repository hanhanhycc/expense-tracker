"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useRef, useState } from "react";
import { useClickOutside } from "@/lib/use-click-outside";
import { NotificationsBell } from "./notifications-bell";

export function TopBar() {
  const { data } = useSession();
  const [open, setOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const name = data?.user?.name || "Bạn";
  const initial = name.charAt(0).toUpperCase();

  useClickOutside({ enabled: open, onClose: () => setOpen(false), ref: menuRef });

  return (
    <header
      className="sticky top-0 z-20"
      style={{
        background: "color-mix(in srgb, var(--bg-base) 70%, transparent)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        borderBottom: "1px solid var(--glass-border)",
      }}
    >
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="Saving Money" className="h-9 w-9 rounded-xl" />
          <span
            className="text-lg font-extrabold tracking-tight bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(135deg, var(--accent-1), var(--accent-2))" }}
          >
            Saving Money
          </span>
        </Link>

        <nav className="hidden desktop:flex items-center gap-1 text-sm">
          <NavLink href="/dashboard">Tổng quan</NavLink>
          <NavLink href="/history">Lịch sử</NavLink>
          <NavLink href="/savings">Tiết kiệm</NavLink>
          <NavLink href="/reports">Báo cáo</NavLink>
          <Link href="/add" className="btn-primary !py-2 !px-4 ml-2">+ Thêm</Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <NotificationsBell />
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setOpen((o) => !o)}
              className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-white font-bold"
              style={{
                background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))",
                boxShadow: "0 6px 18px -4px var(--accent-1)",
              }}
              aria-label="Tài khoản"
              aria-haspopup="menu"
              aria-expanded={open}
            >
              {avatarFailed ? (
                initial
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src="/api/profile/avatar"
                  alt={name}
                  className="w-full h-full object-cover"
                  onError={() => setAvatarFailed(true)}
                />
              )}
            </button>
            {open && (
              <div
                role="menu"
                className="absolute right-0 top-12 w-60 rounded-2xl py-1 text-sm overflow-hidden"
                style={{
                  background: "var(--glass-bg-strong)",
                  backdropFilter: "blur(36px) saturate(180%)",
                  WebkitBackdropFilter: "blur(36px) saturate(180%)",
                  border: "1px solid var(--glass-border)",
                  boxShadow: "var(--glass-shadow-lg)",
                  color: "var(--ink-1)",
                }}
              >
                <div className="px-3 py-2 border-b text-ink-3 text-xs" style={{ borderColor: "var(--glass-stroke)" }}>
                  {data?.user?.email}
                </div>
                <MenuLink href="/settings" onClick={() => setOpen(false)}>⚙️ Cài đặt</MenuLink>
                <MenuLink href="/budgets" onClick={() => setOpen(false)}>💰 Ngân sách</MenuLink>
                <MenuLink href="/settings/profile" onClick={() => setOpen(false)}>👤 Thông tin cá nhân</MenuLink>
                <MenuLink href="/settings/members" onClick={() => setOpen(false)}>👥 Thành viên</MenuLink>
                <MenuLink href="/settings/categories" onClick={() => setOpen(false)}>🏷 Danh mục</MenuLink>
                <button
                  onClick={() => { setOpen(false); signOut({ callbackUrl: "/login" }); }}
                  className="block w-full text-left px-3 py-2 hover:bg-white/30 dark:hover:bg-white/10 text-danger-ink"
                >
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function MenuLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-3 py-2 hover:bg-white/30 dark:hover:bg-white/10 text-ink-1"
    >
      {children}
    </Link>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-2 rounded-full text-ink-2 hover:text-accent transition"
      style={{ }}
    >
      {children}
    </Link>
  );
}
