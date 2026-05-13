import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { seedDefaultCategoriesForFamily } from "@/lib/category-defaults";

/**
 * POST /api/categories/apply-defaults
 * Áp dụng cấu trúc danh mục mặc định mới cho family hiện tại.
 * Idempotent: nếu tên đã tồn tại với cùng parent + kind → skip. KHÔNG xoá categories cũ.
 * ADMIN/OWNER only.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Cần quyền OWNER hoặc ADMIN" }, { status: 403 });
  }

  const before = await prisma.category.count({ where: { familyId: session.user.familyId } });
  await seedDefaultCategoriesForFamily(prisma, session.user.familyId);
  const after = await prisma.category.count({ where: { familyId: session.user.familyId } });

  return NextResponse.json({ ok: true, added: after - before });
}
