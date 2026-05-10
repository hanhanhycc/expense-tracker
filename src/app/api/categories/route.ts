import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  name: z.string().min(1).max(60),
  kind: z.enum(["INCOME", "EXPENSE"]),
  icon: z.string().max(8).optional().nullable(),
  color: z.string().max(20).optional().nullable(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const items = await prisma.category.findMany({
    where: { familyId: session.user.familyId },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "MEMBER") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });

  const created = await prisma.category.create({
    data: { ...parsed.data, familyId: session.user.familyId },
  });
  return NextResponse.json({ id: created.id });
}
