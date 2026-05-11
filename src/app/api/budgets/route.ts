import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listBudgetsForMonth, upsertBudget } from "@/features/budgets/server/service";
import { budgetUpsertSchema, monthSchema } from "@/features/budgets/schema";

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const m = url.searchParams.get("month") || currentMonth();
  const parsed = monthSchema.safeParse(m);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
  const items = await listBudgetsForMonth(session.user.familyId, parsed.data);
  return NextResponse.json({ items, month: parsed.data });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "MEMBER") return NextResponse.json({ error: "Cần quyền ADMIN/OWNER" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const parsed = budgetUpsertSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
  try {
    const { categoryId, month, amount } = parsed.data;
    const b = await upsertBudget(session.user.familyId, categoryId, month, amount);
    return NextResponse.json({ ok: true, id: b?.id ?? null });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
