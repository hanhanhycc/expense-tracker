import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const subSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

/**
 * POST: lưu (hoặc cập nhật) push subscription cho member hiện tại.
 * Idempotent theo endpoint.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = subSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Subscription không hợp lệ" }, { status: 400 });

  const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;
  const { endpoint, keys } = parsed.data;

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      memberId: session.user.memberId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent,
    },
    update: {
      memberId: session.user.memberId,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent,
    },
  });

  return NextResponse.json({ ok: true });
}

/**
 * DELETE: huỷ subscription theo endpoint (client gửi khi user tắt notification).
 */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const endpoint = body?.endpoint as string | undefined;
  if (!endpoint) return NextResponse.json({ error: "Thiếu endpoint" }, { status: 400 });

  await prisma.pushSubscription
    .deleteMany({ where: { endpoint, memberId: session.user.memberId } })
    .catch(() => undefined);

  return NextResponse.json({ ok: true });
}
