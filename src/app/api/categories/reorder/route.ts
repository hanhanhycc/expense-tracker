import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        parentId: z.string().nullable(),
        sortOrder: z.number().int().min(0).max(10_000),
      }),
    )
    .min(1)
    .max(500),
});

/**
 * POST /api/categories/reorder — batch update sortOrder + parentId.
 * Dùng sau khi drag-drop. Validate:
 * - Tất cả items thuộc family của session
 * - Mọi parentId được set phải là root (parentId của parent phải null) — 2 cấp only
 * - Nếu có giao dịch dùng cat A và A đang là root, không cho gán parentId cho A (sẽ thành child có giao dịch).
 *   → Đơn giản hoá: cho phép. Giao dịch vẫn ref đúng id, chỉ vị trí trong tree đổi.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "MEMBER") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });

  const familyId = session.user.familyId;
  const ids = parsed.data.items.map((i) => i.id);

  // Verify tất cả ids thuộc family
  const cats = await prisma.category.findMany({
    where: { id: { in: ids }, familyId },
    select: { id: true, kind: true },
  });
  if (cats.length !== ids.length) {
    return NextResponse.json({ error: "Có danh mục không tồn tại hoặc khác gia đình" }, { status: 400 });
  }
  const kindById = new Map(cats.map((c) => [c.id, c.kind]));

  // Verify parentId hợp lệ: cùng family, cùng kind với child, parent không có parent (root)
  const parentIds = parsed.data.items
    .map((i) => i.parentId)
    .filter((p): p is string => !!p);
  if (parentIds.length > 0) {
    const parents = await prisma.category.findMany({
      where: { id: { in: parentIds }, familyId },
      select: { id: true, kind: true, parentId: true },
    });
    const parentById = new Map(parents.map((p) => [p.id, p]));
    for (const item of parsed.data.items) {
      if (!item.parentId) continue;
      const parent = parentById.get(item.parentId);
      if (!parent) return NextResponse.json({ error: "Nhóm cha không tồn tại" }, { status: 400 });
      if (parent.parentId) return NextResponse.json({ error: "Chỉ cho phép 2 cấp danh mục" }, { status: 400 });
      if (parent.kind !== kindById.get(item.id)) {
        return NextResponse.json({ error: "Không thể chuyển sang nhóm khác loại (Chi/Thu)" }, { status: 400 });
      }
      if (item.parentId === item.id) {
        return NextResponse.json({ error: "Không thể tự làm cha mình" }, { status: 400 });
      }
    }
  }

  // Batch update bằng transaction để atomic
  await prisma.$transaction(
    parsed.data.items.map((it) =>
      prisma.category.update({
        where: { id: it.id },
        data: { parentId: it.parentId, sortOrder: it.sortOrder },
      }),
    ),
  );

  return NextResponse.json({ ok: true, updated: parsed.data.items.length });
}
