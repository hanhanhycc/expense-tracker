import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isWebPushConfigured, sendWebPushToMember } from "@/lib/web-push";

/**
 * POST /api/push/test — gửi 1 push test tới chính member hiện tại.
 * Chỉ ADMIN/OWNER được gọi — endpoint debug, không phải để user thường dùng.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Cần quyền OWNER hoặc ADMIN" }, { status: 403 });
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

  const result = await sendWebPushToMember(session.user.memberId, {
    title: "🔔 Test thông báo đẩy",
    body: "Nếu thấy banner này tức là web push đang hoạt động.",
    url: "/notifications",
    tag: "test",
  });

  return NextResponse.json({
    ok: result.sent > 0,
    ...result,
  });
}
