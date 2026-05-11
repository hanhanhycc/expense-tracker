import { requireAuth } from "@/lib/guards";
import { SavingsClient } from "@/features/savings/components/savings-client";

export default async function SavingsPage() {
  const session = await requireAuth();
  return (
    <SavingsClient
      currentMemberId={session.user.memberId}
      currentRole={session.user.role as "OWNER" | "ADMIN" | "MEMBER"}
    />
  );
}
