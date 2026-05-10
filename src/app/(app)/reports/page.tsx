import { requireAuth } from "@/lib/guards";
import { ReportsClient } from "@/features/reports/components/reports-client";

export default async function ReportsPage() {
  await requireAuth();
  return <ReportsClient />;
}
