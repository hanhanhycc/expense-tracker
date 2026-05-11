import { requireAuth } from "@/lib/guards";
import { BudgetsClient } from "@/features/budgets/components/budgets-client";

export const dynamic = "force-dynamic";

export default async function BudgetsPage() {
  const session = await requireAuth();
  const role = session.user.role as "OWNER" | "ADMIN" | "MEMBER";
  return <BudgetsClient canManage={role !== "MEMBER"} />;
}
