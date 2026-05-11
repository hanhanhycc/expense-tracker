import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const PAGE_SIZE = 50;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Không có quyền xem nhật ký" }, { status: 403 });
  }

  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor");
  const entity = url.searchParams.get("entity");

  const items = await prisma.activityLog.findMany({
    where: {
      familyId: session.user.familyId,
      ...(entity ? { entity } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      actorName: true,
      action: true,
      entity: true,
      entityId: true,
      summary: true,
      createdAt: true,
    },
  });

  const hasMore = items.length > PAGE_SIZE;
  const data = hasMore ? items.slice(0, PAGE_SIZE) : items;

  return NextResponse.json({
    items: data,
    nextCursor: hasMore ? data[data.length - 1].id : null,
  });
}
