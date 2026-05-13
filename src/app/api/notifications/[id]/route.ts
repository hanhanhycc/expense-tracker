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
    // Có thể notif không tồn tại hoặc đã đọc rồi — vẫn trả ok để client idempotent.
    return NextResponse.json({ ok: true, changed: false });
  }
  return NextResponse.json({ ok: true, changed: true });
}
