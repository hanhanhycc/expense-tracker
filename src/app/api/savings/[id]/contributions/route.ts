import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { logActivity } from "@/lib/activity-log";

const schema = z.object({
  amount: z.coerce.number().positive(),
  note: z.string().max(300).optional().nullable(),
  date: z.string().min(1),
  memberId: z.string().min(1),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const goal = await prisma.savingGoal.findFirst({ where: { id, familyId: session.user.familyId, deletedAt: null } });
  if (!goal) return NextResponse.json({ error: "Không tìm thấy mục tiêu" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });

  // memberId phải thuộc family
  const member = await prisma.familyMember.findFirst({
    where: { id: parsed.data.memberId, familyId: session.user.familyId },
    include: { user: { select: { name: true } } },
  });
  if (!member) return NextResponse.json({ error: "Thành viên không hợp lệ" }, { status: 400 });

  const c = await prisma.savingContribution.create({
    data: {
      savingGoalId: id,
      memberId: parsed.data.memberId,
      amount: new Prisma.Decimal(parsed.data.amount),
      note: parsed.data.note ?? null,
      date: new Date(parsed.data.date),
    },
  });

  await logActivity({
    familyId: session.user.familyId,
    actorId: session.user.id,
    actorName: session.user.name || session.user.email,
    action: "CREATE",
    entity: "contribution",
    entityId: c.id,
    summary: `${member.user.name} đóng góp ${parsed.data.amount.toLocaleString("vi-VN")} ₫ vào "${goal.name}"`,
    metadata: { goalId: id },
  });

  return NextResponse.json({ ok: true });
}

