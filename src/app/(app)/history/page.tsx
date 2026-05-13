import { Suspense } from "react";
import { requireAuth } from "@/lib/guards";
import { HistoryClient } from "@/features/transactions/components/history-client";
import { SkeletonList } from "@/components/skeleton";

export default async function HistoryPage() {
  const session = await requireAuth();
  return (
    <Suspense fallback={<div className="card !p-0"><SkeletonList rows={6} /></div>}>
      <HistoryClient currentMemberId={session.user.memberId} />
    </Suspense>
  );
}
