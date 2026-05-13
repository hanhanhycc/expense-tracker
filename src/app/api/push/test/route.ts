import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isWebPushConfigured, sendWebPushToMember } from "@/lib/web-push";

const bodySchema = z.object({
  memberId: z.string().optional(),
  title: z.string().max(120).optional(),
  body: z.string().max(500).optional(),
});

/**
 * POST /api/push/test — gửi push test tới 1 member trong family.
 * Chỉ ADMIN/OWNER được gọi. Nếu không truyền memberId → gửi cho chính mình.
 * Optional: tuỳ chỉnh title + body để test nội dung.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Cần quyền OWNER hoặc ADMIN" }, { status: 403 });
  }

  const raw = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const targetMemberId = parsed.data.memberId || session.user.memberId;

  // Verify target nằm trong cùng family (chống cross-family abuse).
  const target = await prisma.familyMember.findFirst({
    where: { id: targetMemberId, familyId: session.user.familyId },
    select: { id: true, user: { select: { name: true } } },
  });
  if (!target) {
    return NextResponse.json({ error: "Không tìm thấy thành viên trong gia đình" }, { status: 404 });
  }

  if (!isWebPushConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        message:
          "VAPID chưa cấu hình ở server. Kiểm tra .env trên NAS có 3 biến NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.",
      },
      { status: 500 },
    );
  }

  const result = await sendWebPushToMember(targetMemberId, {
    title: parsed.data.title || "🔔 Test thông báo đẩy",
    body: parsed.data.body || "Nếu thấy banner này tức là web push đang hoạt động.",
    url: "/notifications",
    tag: `test-${Date.now()}`,
  });

  return NextResponse.json({
    ok: result.sent > 0,
    targetName: target.user.name,
    ...result,
  });
}
