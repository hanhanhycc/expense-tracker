import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma, GoalStatus, Visibility } from "@prisma/client";
import { sumMoney } from "@/lib/money";
import { logActivity } from "@/lib/activity-log";

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

  // PERSONAL chỉ người tạo mới xem được
  if (g.visibility === Visibility.PERSONAL && g.createdById !== session.user.memberId) {
    return NextResponse.json({ error: "Không có quyền xem mục tiêu này" }, { status: 403 });
  }

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
    visibility: g.visibility,
    createdById: g.createdById,
    targetAmount: g.targetAmount.toString(),
    targetDate: g.targetDate ? g.targetDate.toISOString().slice(0, 10) : null,
    createdAt: g.createdAt.toISOString(),
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
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  status: z.enum(["ACTIVE", "COMPLETED", "ARCHIVED"]).optional(),
});

/** OWNER/ADMIN HOẶC người tạo goal — nhưng nếu PERSONAL thì CHỈ người tạo */
function canManageGoal(
  session: { user: { role: string; memberId: string } },
  goal: { createdById: string; visibility: Visibility }
) {
  if (goal.visibility === Visibility.PERSONAL) {
    return session.user.memberId === goal.createdById;
  }
  return (
    session.user.role === "OWNER" ||
    session.user.role === "ADMIN" ||
    session.user.memberId === goal.createdById
  );
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.savingGoal.findFirst({
    where: { id, familyId: session.user.familyId, deletedAt: null },
    select: { id: true, name: true, targetAmount: true, targetDate: true, status: true, description: true, createdById: true, visibility: true },
  });
  if (!existing) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  if (!canManageGoal(session, existing)) {
    return NextResponse.json({ error: "Bạn không có quyền sửa mục tiêu này" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });

  const data: Prisma.SavingGoalUpdateManyMutationInput = {};
  const changes: string[] = [];
  if (parsed.data.name !== undefined && parsed.data.name !== existing.name) {
    data.name = parsed.data.name;
    changes.push(`tên: "${existing.name}" → "${parsed.data.name}"`);
  }
  if (parsed.data.description !== undefined && parsed.data.description !== existing.description) {
    data.description = parsed.data.description;
    changes.push("mô tả");
  }
  if (parsed.data.targetAmount !== undefined && parsed.data.targetAmount !== Number(existing.targetAmount)) {
    data.targetAmount = new Prisma.Decimal(parsed.data.targetAmount);
    changes.push(
      `mục tiêu: ${Number(existing.targetAmount).toLocaleString("vi-VN")} ₫ → ${parsed.data.targetAmount.toLocaleString("vi-VN")} ₫`
    );
  }
  if (parsed.data.targetDate !== undefined) {
    const newDate = parsed.data.targetDate;
    const oldDate = existing.targetDate ? existing.targetDate.toISOString().slice(0, 10) : null;
    if (newDate !== oldDate) {
      data.targetDate = newDate ? new Date(newDate + "T00:00:00.000Z") : null;
      changes.push(`hạn: ${oldDate ?? "(không hạn)"} → ${newDate ?? "(không hạn)"}`);
    }
  }
  if (parsed.data.status && parsed.data.status !== existing.status) {
    data.status = parsed.data.status as GoalStatus;
    changes.push(`trạng thái: ${existing.status} → ${parsed.data.status}`);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: true, unchanged: true });
  }

  await prisma.savingGoal.update({ where: { id }, data });

  await logActivity({
    familyId: session.user.familyId,
    actorId: session.user.id,
    actorName: session.user.name || session.user.email,
    action: "UPDATE",
    entity: "saving_goal",
    entityId: id,
    summary: `Sửa mục tiêu "${existing.name}" — ${changes.join(", ")}`,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.savingGoal.findFirst({
    where: { id, familyId: session.user.familyId, deletedAt: null },
    select: { id: true, name: true, createdById: true, visibility: true },
  });
  if (!existing) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  if (!canManageGoal(session, existing)) {
    return NextResponse.json({ error: "Bạn không có quyền xoá mục tiêu này" }, { status: 403 });
  }

  await prisma.savingGoal.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await logActivity({
    familyId: session.user.familyId,
    actorId: session.user.id,
    actorName: session.user.name || session.user.email,
    action: "DELETE",
    entity: "saving_goal",
    entityId: id,
    summary: `Xoá mục tiêu "${existing.name}"`,
  });

  return NextResponse.json({ ok: true });
}


