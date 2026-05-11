import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { logActivity } from "@/lib/activity-log";

const patchSchema = z.object({
  amount: z.coerce.number().positive().optional(),
  note: z.string().max(300).optional().nullable(),
  date: z.string().min(1).optional(),
});

/** OWNER/ADMIN HOẶC chính người đã đóng góp (memberId == self) */
function canManageContribution(
  session: { user: { role: string; memberId: string } },
  contributionMemberId: string,
  goalCreatedById: string
) {
  return (
    session.user.role === "OWNER" ||
    session.user.role === "ADMIN" ||
    session.user.memberId === contributionMemberId ||
    session.user.memberId === goalCreatedById
  );
}

async function loadContext(familyId: string, goalId: string, cid: string) {
  const goal = await prisma.savingGoal.findFirst({
    where: { id: goalId, familyId, deletedAt: null },
    select: { id: true, name: true, createdById: true },
  });
  if (!goal) return { error: "Không tìm thấy mục tiêu" as const };
  const c = await prisma.savingContribution.findFirst({
    where: { id: cid, savingGoalId: goalId },
    include: { member: { include: { user: { select: { name: true } } } } },
  });
  if (!c) return { error: "Không tìm thấy đóng góp" as const };
  return { goal, contribution: c };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; cid: string }> }
) {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, cid } = await params;

  const ctx = await loadContext(session.user.familyId, id, cid);
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: 404 });
  if (!canManageContribution(session, ctx.contribution.memberId, ctx.goal.createdById)) {
    return NextResponse.json({ error: "Bạn không có quyền sửa đóng góp này" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });

  const data: Prisma.SavingContributionUpdateInput = {};
  const changes: string[] = [];
  if (parsed.data.amount !== undefined && parsed.data.amount !== Number(ctx.contribution.amount)) {
    data.amount = new Prisma.Decimal(parsed.data.amount);
    changes.push(
      `số tiền: ${Number(ctx.contribution.amount).toLocaleString("vi-VN")} ₫ → ${parsed.data.amount.toLocaleString("vi-VN")} ₫`
    );
  }
  if (parsed.data.note !== undefined && parsed.data.note !== ctx.contribution.note) {
    data.note = parsed.data.note;
    changes.push("ghi chú");
  }
  if (parsed.data.date !== undefined) {
    const newDate = new Date(parsed.data.date);
    if (newDate.toISOString().slice(0, 10) !== ctx.contribution.date.toISOString().slice(0, 10)) {
      data.date = newDate;
      changes.push("ngày");
    }
  }

  if (Object.keys(data).length === 0) return NextResponse.json({ ok: true, unchanged: true });

  await prisma.savingContribution.update({ where: { id: cid }, data });

  await logActivity({
    familyId: session.user.familyId,
    actorId: session.user.id,
    actorName: session.user.name || session.user.email,
    action: "UPDATE",
    entity: "contribution",
    entityId: cid,
    summary: `Sửa đóng góp của ${ctx.contribution.member.user.name} ở "${ctx.goal.name}" — ${changes.join(", ")}`,
    metadata: { goalId: id },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; cid: string }> }
) {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, cid } = await params;

  const ctx = await loadContext(session.user.familyId, id, cid);
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: 404 });
  if (!canManageContribution(session, ctx.contribution.memberId, ctx.goal.createdById)) {
    return NextResponse.json({ error: "Bạn không có quyền xoá đóng góp này" }, { status: 403 });
  }

  await prisma.savingContribution.delete({ where: { id: cid } });

  await logActivity({
    familyId: session.user.familyId,
    actorId: session.user.id,
    actorName: session.user.name || session.user.email,
    action: "DELETE",
    entity: "contribution",
    entityId: cid,
    summary: `Xoá đóng góp ${Number(ctx.contribution.amount).toLocaleString("vi-VN")} ₫ của ${ctx.contribution.member.user.name} ở "${ctx.goal.name}"`,
    metadata: { goalId: id },
  });

  return NextResponse.json({ ok: true });
}
