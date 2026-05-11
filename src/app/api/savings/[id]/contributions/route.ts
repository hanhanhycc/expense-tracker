import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma, Visibility } from "@prisma/client";
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

  const goal = await prisma.savingGoal.findFirst({
    where: { id, familyId: session.user.familyId, deletedAt: null },
    include: { members: { select: { memberId: true } } },
  });
  if (!goal) return NextResponse.json({ error: "Không tìm thấy mục tiêu" }, { status: 404 });

  // Kiểm tra quyền xem
  if (goal.visibility === Visibility.PERSONAL && goal.createdById !== session.user.memberId) {
    return NextResponse.json({ error: "Không có quyền truy cập mục tiêu này" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });

  // Quyền đóng góp:
  // - PERSONAL: chỉ chính người tạo, và memberId phải là chính họ.
  // - SHARED: memberId phải nằm trong danh sách thành viên được chia + người đăng nhập cũng phải nằm trong đó (không cho người ngoài góp hộ).
  const goalMemberIds = new Set(goal.members.map((m) => m.memberId));
  if (goal.visibility === Visibility.PERSONAL) {
    if (parsed.data.memberId !== session.user.memberId || session.user.memberId !== goal.createdById) {
      return NextResponse.json({ error: "Chỉ chủ mục tiêu cá nhân mới được đóng góp" }, { status: 403 });
    }
  } else {
    if (!goalMemberIds.has(session.user.memberId)) {
      return NextResponse.json({ error: "Bạn không nằm trong danh sách được chia mục tiêu này" }, { status: 403 });
    }
    if (!goalMemberIds.has(parsed.data.memberId)) {
      return NextResponse.json({ error: "Thành viên này không được chia sẻ mục tiêu" }, { status: 400 });
    }
  }

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


