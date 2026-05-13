import { NextResponse } from "next/server";
import { z } from "zod";
import { AccountType } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  name: z.string().min(1).max(60).optional(),
  type: z.nativeEnum(AccountType).optional(),
  icon: z.string().max(8).optional().nullable(),
  color: z.string().max(20).optional().nullable(),
  isDefault: z.boolean().optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "MEMBER") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });

  // Nếu set isDefault = true, bỏ default cũ (1 family chỉ có 1 default).
  if (parsed.data.isDefault) {
    await prisma.account.updateMany({
      where: { familyId: session.user.familyId, isDefault: true, NOT: { id } },
      data: { isDefault: false },
    });
  }

  const r = await prisma.account.updateMany({
    where: { id, familyId: session.user.familyId, deletedAt: null },
    data: parsed.data,
  });
  if (r.count === 0) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

/**
 * Soft delete. Nếu account đang được dùng bởi giao dịch, vẫn cho xoá —
 * `onDelete: SetNull` ở Transaction.accountId sẽ tự null hoá. Tuy nhiên ở đây
 * là soft delete (deletedAt) nên giao dịch cũ vẫn ref tới — chỉ ẩn account
 * khỏi list (deletedAt filter).
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "MEMBER") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const { id } = await params;
  const r = await prisma.account.updateMany({
    where: { id, familyId: session.user.familyId, deletedAt: null },
    data: { deletedAt: new Date(), isDefault: false },
  });
  if (r.count === 0) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
