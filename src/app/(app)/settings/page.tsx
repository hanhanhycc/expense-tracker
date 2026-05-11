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
  ].filter(Boolean) as { href: string; icon: string; title: string; desc: string }[];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Cài đặt</h1>
      <ul className="grid gap-3 desktop:grid-cols-2">
        {items.map((it) => (
          <li key={it.href}>
            <Link
              href={it.href}
              className="card flex items-center gap-3 hover:border-primary/40 hover:shadow transition"
            >
              <span className="text-2xl">{it.icon}</span>
              <div className="flex-1">
                <p className="font-medium">{it.title}</p>
                <p className="text-xs text-gray-500">{it.desc}</p>
              </div>
              <span className="text-gray-400">›</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
