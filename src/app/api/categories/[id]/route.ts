import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  name: z.string().min(1).max(60).optional(),
  icon: z.string().max(8).optional().nullable(),
  color: z.string().max(20).optional().nullable(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "MEMBER") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });

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
  if (used > 0) return NextResponse.json({ error: "Danh mục đang được dùng, không thể xoá" }, { status: 400 });
  await prisma.category.deleteMany({ where: { id, familyId: session.user.familyId } });
  return NextResponse.json({ ok: true });
}
