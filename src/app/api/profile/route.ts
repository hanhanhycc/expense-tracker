import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity-log";

const schema = z.object({
  name: z.string().trim().min(1, "Tên không được trống").max(80),
  email: z.string().trim().email("Email không hợp lệ"),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[0-9+\-\s()]*$/, "Số điện thoại không hợp lệ")
    .optional()
    .or(z.literal("")),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, phone: true },
  });
  if (!user) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" }, { status: 400 });
  }
  const { name, email, phone } = parsed.data;

  // Kiểm tra email trùng (nếu đổi)
  if (email !== session.user.email) {
    const existed = await prisma.user.findUnique({ where: { email } });
    if (existed && existed.id !== session.user.id) {
      return NextResponse.json({ error: "Email đã được sử dụng" }, { status: 409 });
    }
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { name, email, phone: phone ? phone : null },
    select: { id: true, name: true, email: true, phone: true },
  });

  if (session.user.familyId) {
    const changes: string[] = [];
    if (name !== session.user.name) changes.push(`tên: "${session.user.name}" → "${name}"`);
    if (email !== session.user.email) changes.push(`email: ${session.user.email} → ${email}`);
    if ((phone || "") !== "") changes.push("số điện thoại");
    if (changes.length > 0) {
      await logActivity({
        familyId: session.user.familyId,
        actorId: session.user.id,
        actorName: name,
        action: "UPDATE",
        entity: "profile",
        entityId: session.user.id,
        summary: `Cập nhật hồ sơ cá nhân — ${changes.join(", ")}`,
      });
    }
  }

  return NextResponse.json(updated);
}
