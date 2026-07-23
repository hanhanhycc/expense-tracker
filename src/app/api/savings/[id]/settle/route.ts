import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { settleSavingGoal } from "@/features/savings/server/settle-service";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const result = await settleSavingGoal({
    familyId: session.user.familyId,
    goalId: id,
    actor: {
      userId: session.user.id,
      memberId: session.user.memberId,
      name: session.user.name || session.user.email,
      role: session.user.role,
    },
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, transactionId: result.transactionId, total: result.total });
}
