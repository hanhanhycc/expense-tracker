import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";
import { logActivity } from "@/lib/activity-log";

const schema = z.object({
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

function genCode(len = 8) {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "MEMBER") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  const role = (parsed.success ? parsed.data.role : "MEMBER") as Role;

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // sinh code unique (retry vài lần)
  let code = genCode();
  for (let i = 0; i < 5; i++) {
    const existed = await prisma.invite.findUnique({ where: { code } });
    if (!existed) break;
    code = genCode();
  }

  const invite = await prisma.invite.create({
    data: { familyId: session.user.familyId, code, role, expiresAt },
  });

  await logActivity({
    familyId: session.user.familyId,
    actorId: session.user.id,
    actorName: session.user.name || session.user.email,
    action: "INVITE",
    entity: "invite",
    entityId: invite.id,
    summary: `Tạo mã mời ${invite.code} (vai trò ${role})`,
  });

  return NextResponse.json({ code: invite.code, expiresAt: invite.expiresAt });
}
