import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/guards";
import { LogsClient } from "@/features/members/components/logs-client";

export default async function LogsPage() {
  const session = await requireAuth();
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    redirect("/settings");
  }
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold tracking-tight px-1">Nhật ký hoạt động</h1>
      <p className="text-sm text-ink-3 px-1">
        Lịch sử thay đổi trong gia đình. Chỉ chủ gia đình & quản trị viên mới xem được.
      </p>
      <LogsClient />
    </div>
  );
}
