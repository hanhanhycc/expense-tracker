import Link from "next/link";
import { requireAuth } from "@/lib/guards";
import { prisma } from "@/lib/db";

export default async function SettingsIndexPage() {
  const session = await requireAuth();
  const family = await prisma.family.findUnique({
    where: { id: session.user.familyId },
    select: { name: true },
  });
  const isOwner = session.user.role === "OWNER";
  const canManage = isOwner || session.user.role === "ADMIN";

  const items = [
    { href: "/settings/profile", icon: "👤", title: "Thông tin cá nhân", desc: "Tên, email, số điện thoại" },
    canManage && { href: "/settings/members", icon: "👥", title: "Thành viên", desc: "Mời, đổi vai trò, xoá thành viên" },
    isOwner && { href: "/settings/family", icon: "🏠", title: "Gia đình", desc: `Sửa tên gia đình "${family?.name ?? ""}"` },
    { href: "/settings/categories", icon: "🏷", title: "Danh mục", desc: "Quản lý danh mục thu / chi" },
    { href: "/settings/accounts", icon: "🏦", title: "Tài khoản", desc: "Tiền mặt, ngân hàng, thẻ tín dụng, ví điện tử" },
    canManage && { href: "/settings/logs", icon: "📝", title: "Nhật ký hoạt động", desc: "Lịch sử thay đổi trong gia đình" },
    canManage && { href: "/settings/debug", icon: "🛠", title: "Debug & Bảo trì", desc: "Test thông báo đẩy, công cụ admin" },
  ].filter(Boolean) as { href: string; icon: string; title: string; desc: string }[];

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-2xl font-extrabold tracking-tight px-1">Cài đặt</h1>
      <ul className="grid gap-3 desktop:grid-cols-2">
        {items.map((it) => (
          <li key={it.href}>
            <Link
              href={it.href}
              className="card flex items-center gap-3 hover:border-accent/40 transition"
            >
              <span
                className="w-11 h-11 rounded-2xl grid place-items-center text-xl shrink-0"
                style={{
                  background: "var(--glass-bg-strong)",
                  border: "1px solid var(--glass-border)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
                }}
              >
                {it.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-ink-1">{it.title}</p>
                <p className="text-xs text-ink-3 mt-0.5">{it.desc}</p>
              </div>
              <span className="text-ink-3 text-lg">›</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
