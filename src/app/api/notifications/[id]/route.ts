import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * PATCH /api/notifications/[id]  → mark 1 notification as read.
 */
export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const result = await prisma.notification.updateMany({
    where: { id, recipientId: session.user.memberId, readAt: null },
    data: { readAt: new Date() },
  });
  if (result.count === 0) {
    return NextResponse.json({ ok: true, changed: false });
  }
  return NextResponse.json({ ok: true, changed: true });
}

/**
 * DELETE /api/notifications/[id]  → xoá hẳn 1 notification của member hiện tại.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  await prisma.notification
    .deleteMany({ where: { id, recipientId: session.user.memberId } })
    .catch(() => undefined);
  return NextResponse.json({ ok: true });
}
