import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  name: z.string().trim().min(1, "Tên gia đình không được trống").max(80),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const family = await prisma.family.findUnique({
    where: { id: session.user.familyId },
    select: { id: true, name: true, createdAt: true },
  });
  if (!family) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  return NextResponse.json(family);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Chỉ chủ gia đình mới được sửa thông tin gia đình" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const updated = await prisma.family.update({
    where: { id: session.user.familyId },
    data: { name: parsed.data.name },
    select: { id: true, name: true },
  });
  return NextResponse.json(updated);
}
