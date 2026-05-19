import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/guards";
import { DebugClient } from "./debug-client";

export default async function SettingsDebugPage() {
  const session = await requireAuth();
  const canManage = session.user.role === "OWNER" || session.user.role === "ADMIN";
  if (!canManage) redirect("/settings");

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="px-1">
        <h1 className="text-2xl font-extrabold tracking-tight">🛠 Debug & Bảo trì</h1>
        <p className="text-sm text-ink-3 mt-1">Công cụ chẩn đoán dành cho ADMIN/OWNER.</p>
      </div>
      <DebugClient />
    </div>
  );
}
