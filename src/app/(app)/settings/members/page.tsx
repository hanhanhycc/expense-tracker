import { requireAuth } from "@/lib/guards";
import { MembersClient } from "@/features/members/components/members-client";

export default async function MembersPage() {
  const session = await requireAuth();
  const canManage = session.user.role === "OWNER" || session.user.role === "ADMIN";
  return <MembersClient canManage={canManage} currentMemberId={session.user.memberId} />;
}
