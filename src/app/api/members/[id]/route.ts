import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";

const patchSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"]),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const target = await prisma.familyMember.findFirst({ where: { id, familyId: session.user.familyId } });
  if (!target) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  if (target.role === "OWNER") {
    return NextResponse.json({ error: "Không thể đổi vai trò của chủ gia đình" }, { status: 400 });
  }
  if (target.id === session.user.memberId) {
    return NextResponse.json({ error: "Không thể đổi vai trò của chính mình" }, { status: 400 });
  }

  const updated = await prisma.familyMember.update({
    where: { id },
    data: { role: parsed.data.role as Role },
    select: { id: true, role: true },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "MEMBER") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  const { id } = await params;

  if (id === session.user.memberId) {
    return NextResponse.json({ error: "Không thể xoá chính mình" }, { status: 400 });
  }
  const target = await prisma.familyMember.findFirst({ where: { id, familyId: session.user.familyId } });
  if (!target) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  if (target.role === "OWNER") return NextResponse.json({ error: "Không thể xoá chủ gia đình" }, { status: 400 });

  await prisma.familyMember.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

