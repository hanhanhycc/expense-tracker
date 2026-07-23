import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { settleSavingGoal } from "@/features/savings/server/settle-service";

const settleSchema = z
  .object({
    // Bỏ trống = tất toán toàn bộ. Có giá trị = số tiền muốn rút (chia pro-rata).
    amount: z.number().positive().optional(),
  })
  .optional();

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  let body: unknown = undefined;
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }
  const parsed = settleSchema.safeParse(body ?? undefined);
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });

  const result = await settleSavingGoal({
    familyId: session.user.familyId,
    goalId: id,
    actor: {
      userId: session.user.id,
      memberId: session.user.memberId,
      name: session.user.name || session.user.email,
      role: session.user.role,
    },
    amount: parsed.data?.amount,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, transactionId: result.transactionId, total: result.total });
}
