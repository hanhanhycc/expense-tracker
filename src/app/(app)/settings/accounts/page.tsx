import { requireAuth } from "@/lib/guards";
import { AccountsClient } from "@/features/accounts/components/accounts-client";

export default async function AccountsPage() {
  const session = await requireAuth();
  const canManage = session.user.role === "OWNER" || session.user.role === "ADMIN";
  return <AccountsClient canManage={canManage} />;
}
