import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma, GoalStatus } from "@prisma/client";
import { sumMoney } from "@/lib/money";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const g = await prisma.savingGoal.findFirst({
    where: { id, familyId: session.user.familyId, deletedAt: null },
    include: {
      members: { include: { member: { include: { user: true } } } },
      contributions: { include: { member: { include: { user: true } } }, orderBy: { date: "desc" } },
    },
  });
  if (!g) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  const total = sumMoney(g.contributions.map((c) => c.amount.toString()));
  const byMember = new Map<string, number>();
  for (const c of g.contributions) {
    byMember.set(c.memberId, (byMember.get(c.memberId) || 0) + Number(c.amount));
  }

  return NextResponse.json({
    id: g.id,
    name: g.name,
    description: g.description,
    status: g.status,
    targetAmount: g.targetAmount.toString(),
    totalContributed: total.toString(),
    progress: Number(g.targetAmount) > 0 ? Math.min(100, (Number(total) / Number(g.targetAmount)) * 100) : 0,
    members: g.members.map((m) => ({
      memberId: m.memberId,
      name: m.member.user.name,
      contributed: byMember.get(m.memberId) || 0,
    })),
    contributions: g.contributions.map((c) => ({
      id: c.id,
      memberId: c.memberId,
      memberName: c.member.user.name,
      amount: c.amount.toString(),
      note: c.note,
      date: c.date,
    })),
  });
}

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional().nullable(),
  targetAmount: z.coerce.number().positive().optional(),
  status: z.enum(["ACTIVE", "COMPLETED", "ARCHIVED"]).optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });

  const data: Prisma.SavingGoalUpdateManyMutationInput = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.description !== undefined) data.description = parsed.data.description;
  if (parsed.data.targetAmount !== undefined) data.targetAmount = new Prisma.Decimal(parsed.data.targetAmount);
  if (parsed.data.status) data.status = parsed.data.status as GoalStatus;

  const r = await prisma.savingGoal.updateMany({
    where: { id, familyId: session.user.familyId, deletedAt: null },
    data,
  });
  if (r.count === 0) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "MEMBER") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  const { id } = await params;
  await prisma.savingGoal.updateMany({
    where: { id, familyId: session.user.familyId },
    data: { deletedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
