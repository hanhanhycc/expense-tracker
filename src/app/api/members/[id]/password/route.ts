import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity-log";

const schema = z.object({
  newPassword: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự").max(100),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const { id } = await params;
  const target = await prisma.familyMember.findFirst({
    where: { id, familyId: session.user.familyId },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!target) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  // ADMIN không thể đổi mật khẩu của OWNER hoặc ADMIN khác
  if (session.user.role === "ADMIN" && (target.role === "OWNER" || target.role === "ADMIN")) {
    return NextResponse.json({ error: "Quản trị không thể đổi mật khẩu của Chủ/Quản trị khác" }, { status: 403 });
  }
  // Không dùng API này để đổi mật khẩu của chính mình
  if (target.user.id === session.user.id) {
    return NextResponse.json({ error: "Hãy dùng trang Hồ sơ để đổi mật khẩu của chính bạn" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({
    where: { id: target.user.id },
    data: { passwordHash },
  });

  await logActivity({
    familyId: session.user.familyId,
    actorId: session.user.id,
    actorName: session.user.name || session.user.email,
    action: "UPDATE",
    entity: "member",
    entityId: target.id,
    summary: `Đặt lại mật khẩu cho ${target.user.name}`,
  });

  return NextResponse.json({ ok: true });
}
