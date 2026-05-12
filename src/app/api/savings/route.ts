import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma, GoalStatus, Visibility } from "@prisma/client";
import { sumMoney } from "@/lib/money";
import { logActivity } from "@/lib/activity-log";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  targetAmount: z.coerce.number().positive(),
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  visibility: z.enum(["PERSONAL", "SHARED"]).default("SHARED"),
  memberIds: z.array(z.string()).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const goals = await prisma.savingGoal.findMany({
    where: {
      familyId: session.user.familyId,
      deletedAt: null,
      OR: [
        { visibility: Visibility.SHARED },
        { visibility: Visibility.PERSONAL, createdById: session.user.memberId },
      ],
    },
    include: {
      members: { include: { member: { include: { user: true } } } },
      contributions: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const items = goals.map((g) => {
    const total = sumMoney(g.contributions.map((c) => c.amount.toString()));
    return {
      id: g.id,
      name: g.name,
      description: g.description,
      status: g.status,
      visibility: g.visibility,
      createdById: g.createdById,
      targetAmount: g.targetAmount.toString(),
      targetDate: g.targetDate ? g.targetDate.toISOString().slice(0, 10) : null,
      createdAt: g.createdAt.toISOString(),
      totalContributed: total.toString(),
      progress: Number(g.targetAmount) > 0 ? Math.min(100, (Number(total) / Number(g.targetAmount)) * 100) : 0,
      members: g.members.map((m) => ({ memberId: m.memberId, name: m.member.user.name })),
    };
  });

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });

  // PERSONAL: bỏ qua memberIds, luôn chỉ là chính người tạo
  let memberIds: string[];
  if (parsed.data.visibility === "PERSONAL") {
    memberIds = [session.user.memberId];
  } else {
    memberIds = parsed.data.memberIds ?? [];
    if (memberIds.length === 0) {
      return NextResponse.json({ error: "Mục tiêu chung phải có ít nhất 1 thành viên" }, { status: 400 });
    }
    // Đảm bảo memberIds đều thuộc family hiện tại
    const validMembers = await prisma.familyMember.findMany({
      where: { id: { in: memberIds }, familyId: session.user.familyId },
      select: { id: true },
    });
    if (validMembers.length !== memberIds.length) {
      return NextResponse.json({ error: "Có thành viên không thuộc gia đình" }, { status: 400 });
    }
  }

  const goal = await prisma.savingGoal.create({
    data: {
      familyId: session.user.familyId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      targetAmount: new Prisma.Decimal(parsed.data.targetAmount),
      targetDate: parsed.data.targetDate ? new Date(parsed.data.targetDate + "T00:00:00.000Z") : null,
      status: GoalStatus.ACTIVE,
      visibility: parsed.data.visibility as Visibility,
      createdById: session.user.memberId,
      members: { create: memberIds.map((mid) => ({ memberId: mid })) },
    },
  });

  await logActivity({
    familyId: session.user.familyId,
    actorId: session.user.id,
    actorName: session.user.name || session.user.email,
    action: "CREATE",
    entity: "saving_goal",
    entityId: goal.id,
    summary: `Tạo mục tiêu ${parsed.data.visibility === "PERSONAL" ? "(cá nhân)" : "(chung)"} "${goal.name}" — ${parsed.data.targetAmount.toLocaleString("vi-VN")} ₫`,
  });

  return NextResponse.json({ id: goal.id });
}


