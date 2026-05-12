import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listBudgetsForMonth, upsertBudget } from "@/features/budgets/server/service";
import { budgetUpsertSchema, budgetScopeSchema, monthSchema } from "@/features/budgets/schema";

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const m = url.searchParams.get("month") || currentMonth();
  const parsedMonth = monthSchema.safeParse(m);
  if (!parsedMonth.success) return NextResponse.json({ error: parsedMonth.error.errors[0]?.message }, { status: 400 });
  const parsedScope = budgetScopeSchema.safeParse(url.searchParams.get("scope") || "PERSONAL");
  if (!parsedScope.success) return NextResponse.json({ error: "Scope không hợp lệ" }, { status: 400 });
  const scope = parsedScope.data;
  const items = await listBudgetsForMonth(
    session.user.familyId,
    parsedMonth.data,
    scope,
    scope === "PERSONAL" ? session.user.memberId : null,
  );
  return NextResponse.json({ items, month: parsedMonth.data, scope });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = budgetUpsertSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
  const { categoryId, month, amount, scope } = parsed.data;
  // Ngân sách chung chỉ ADMIN/OWNER được sửa. Ngân sách cá nhân thì ai cũng tự sửa.
  if (scope === "SHARED" && session.user.role === "MEMBER") {
    return NextResponse.json({ error: "Cần quyền ADMIN/OWNER để sửa ngân sách chung" }, { status: 403 });
  }
  try {
    const ownerMemberId = scope === "PERSONAL" ? session.user.memberId : null;
    const b = await upsertBudget(session.user.familyId, categoryId, month, amount, scope, ownerMemberId);
    return NextResponse.json({ ok: true, id: b?.id ?? null });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
