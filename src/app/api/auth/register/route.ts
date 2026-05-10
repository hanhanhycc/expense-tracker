import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { CategoryKind, Role } from "@prisma/client";

const schema = z
  .object({
    name: z.string().min(1).max(80),
    email: z.string().email(),
    password: z.string().min(6).max(128),
    familyName: z.string().min(1).max(80).optional(),
    inviteCode: z.string().min(4).max(32).optional(),
  })
  .refine((d) => d.familyName || d.inviteCode, {
    message: "Phải nhập tên gia đình hoặc mã mời",
  });

const DEFAULT_EXPENSE = [
  ["Ăn uống", "🍜", "#f59e0b"],
  ["Nhà cửa", "🏠", "#0ea5e9"],
  ["Đi lại", "🚗", "#6366f1"],
  ["Con cái", "👶", "#ec4899"],
  ["Sức khoẻ", "💊", "#10b981"],
  ["Mua sắm", "🛍️", "#8b5cf6"],
  ["Giải trí", "🎬", "#f43f5e"],
  ["Gia đình / Họ hàng", "👪", "#14b8a6"],
  ["Học tập", "📚", "#3b82f6"],
  ["Khác", "📦", "#6b7280"],
] as const;

const DEFAULT_INCOME = [
  ["Lương", "💼", "#16a34a"],
  ["Thưởng", "🎁", "#22c55e"],
  ["Kinh doanh", "🏪", "#0891b2"],
  ["Hoàn tiền", "↩️", "#84cc16"],
  ["Khác", "💰", "#6b7280"],
] as const;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }
  const { name, email, password, familyName, inviteCode } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "Email đã được sử dụng" }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 12);

  let familyId: string;
  let role: Role = Role.OWNER;

  if (inviteCode) {
    const invite = await prisma.invite.findUnique({ where: { code: inviteCode } });
    if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
      return NextResponse.json({ error: "Mã mời không hợp lệ hoặc đã hết hạn" }, { status: 400 });
    }
    familyId = invite.familyId;
    role = invite.role;
    await prisma.invite.update({ where: { id: invite.id }, data: { usedAt: new Date() } });
  } else {
    const family = await prisma.family.create({ data: { name: familyName! } });
    familyId = family.id;

    // Seed default categories cho family mới
    await prisma.category.createMany({
      data: [
        ...DEFAULT_EXPENSE.map(([n, i, c]) => ({ name: n, icon: i, color: c, kind: CategoryKind.EXPENSE, isDefault: true, familyId })),
        ...DEFAULT_INCOME.map(([n, i, c]) => ({ name: n, icon: i, color: c, kind: CategoryKind.INCOME, isDefault: true, familyId })),
      ],
    });
  }

  await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      members: { create: { familyId, role } },
    },
  });

  return NextResponse.json({ ok: true });
}
