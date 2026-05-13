import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  name: z.string().min(1).max(60).optional(),
  icon: z.string().max(8).optional().nullable(),
  color: z.string().max(20).optional().nullable(),
  parentId: z.string().optional().nullable(),
  isEnabled: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "MEMBER") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });

  // Verify parentId nếu được set
  if (parsed.data.parentId !== undefined && parsed.data.parentId !== null) {
    if (parsed.data.parentId === id) {
      return NextResponse.json({ error: "Không thể tự làm cha của chính mình" }, { status: 400 });
    }
    const current = await prisma.category.findFirst({ where: { id, familyId: session.user.familyId } });
    if (!current) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    const parent = await prisma.category.findFirst({
      where: { id: parsed.data.parentId, familyId: session.user.familyId, kind: current.kind },
      select: { id: true, parentId: true },
    });
    if (!parent) return NextResponse.json({ error: "Nhóm cha không hợp lệ" }, { status: 400 });
    if (parent.parentId) return NextResponse.json({ error: "Chỉ cho phép 2 cấp danh mục" }, { status: 400 });
  }

  const r = await prisma.category.updateMany({
    where: { id, familyId: session.user.familyId },
    data: parsed.data,
  });
  if (r.count === 0) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "MEMBER") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  const { id } = await params;

  const used = await prisma.transaction.count({ where: { categoryId: id, familyId: session.user.familyId } });
  if (used > 0) {
    return NextResponse.json({ error: "Danh mục đang được dùng. Tắt (disable) thay vì xoá." }, { status: 400 });
  }
  const childCount = await prisma.category.count({ where: { parentId: id, familyId: session.user.familyId } });
  if (childCount > 0) {
    return NextResponse.json({ error: `Có ${childCount} danh mục con. Xoá/chuyển cha của chúng trước.` }, { status: 400 });
  }
  await prisma.category.deleteMany({ where: { id, familyId: session.user.familyId } });
  return NextResponse.json({ ok: true });
}
