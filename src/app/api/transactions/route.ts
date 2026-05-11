import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { transactionFilterSchema, transactionInputSchema } from "@/features/transactions/schema";
import { createTransaction, listTransactions } from "@/features/transactions/server/service";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const parsed = transactionFilterSchema.safeParse(Object.fromEntries(url.searchParams));
  const filter = parsed.success ? parsed.data : {};
  const items = await listTransactions(session.user.familyId, session.user.memberId, filter);
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = transactionInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message || "Dữ liệu không hợp lệ" }, { status: 400 });
  }
  try {
    const created = await createTransaction(session.user.familyId, session.user.memberId, parsed.data);
    return NextResponse.json({ id: created.id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
