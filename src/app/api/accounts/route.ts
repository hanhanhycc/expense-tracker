import { NextResponse } from "next/server";
import { z } from "zod";
import { AccountType } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  name: z.string().min(1).max(60),
  type: z.nativeEnum(AccountType),
  icon: z.string().max(8).optional().nullable(),
  color: z.string().max(20).optional().nullable(),
  bankCode: z.string().max(40).optional().nullable(),
});

/**
 * Bootstrap idempotent: nếu family chưa có account nào, tạo 1 "Tiền mặt" default.
 * Đảm bảo data cũ vẫn dùng được sau migration.
 */
async function ensureDefaultAccount(familyId: string) {
  const count = await prisma.account.count({ where: { familyId, deletedAt: null } });
  if (count === 0) {
    await prisma.account
      .create({
        data: {
          familyId,
          name: "Tiền mặt",
          type: AccountType.CASH,
          icon: "💵",
          color: "#10b981",
          isDefault: true,
        },
      })
      .catch(() => undefined);
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureDefaultAccount(session.user.familyId);

  const items = await prisma.account.findMany({
    where: { familyId: session.user.familyId, deletedAt: null },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
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

  const created = await prisma.account.create({
    data: { ...parsed.data, familyId: session.user.familyId },
  });
  return NextResponse.json({ id: created.id });
}
