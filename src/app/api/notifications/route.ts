import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/notifications?unread=1&limit=20
 * Trả về notification của member đang đăng nhập.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get("unread") === "1";
  const limitRaw = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 && limitRaw <= 100 ? limitRaw : 20;

  const where = {
    recipientId: session.user.memberId,
    ...(unreadOnly ? { readAt: null } : {}),
  };

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.notification.count({ where: { recipientId: session.user.memberId, readAt: null } }),
  ]);

  return NextResponse.json({
    items: items.map((n) => ({
      id: n.id,
      type: n.type,
      entity: n.entity,
      entityId: n.entityId,
      summary: n.summary,
      actorName: n.actorName,
      readAt: n.readAt,
      createdAt: n.createdAt,
      metadata: n.metadata,
    })),
    unreadCount,
  });
}

/**
 * PATCH /api/notifications  → mark all as read cho member hiện tại.
 */
export async function PATCH() {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.notification.updateMany({
    where: { recipientId: session.user.memberId, readAt: null },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
