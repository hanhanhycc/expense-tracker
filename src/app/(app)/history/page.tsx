import { requireAuth } from "@/lib/guards";
import { HistoryClient } from "@/features/transactions/components/history-client";

export default async function HistoryPage() {
  const session = await requireAuth();
  return <HistoryClient currentMemberId={session.user.memberId} />;
}
