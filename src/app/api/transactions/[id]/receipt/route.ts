import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteReceipt, isAllowedReceiptMime, RECEIPT_MAX_BYTES, readReceipt, saveReceipt } from "@/lib/upload";

async function getOwnedTx(familyId: string, id: string) {
  return prisma.transaction.findFirst({ where: { id, familyId, deletedAt: null } });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const tx = await getOwnedTx(session.user.familyId, id);
  if (!tx) return NextResponse.json({ error: "Không tìm thấy giao dịch" }, { status: 404 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Thiếu file" }, { status: 400 });
  if (file.size > RECEIPT_MAX_BYTES) return NextResponse.json({ error: "File vượt 8MB" }, { status: 400 });
  if (!isAllowedReceiptMime(file.type)) return NextResponse.json({ error: "Chỉ chấp nhận JPG/PNG/WEBP/HEIC" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const relPath = await saveReceipt(id, buf, file.type);
  await prisma.transaction.update({ where: { id }, data: { receiptPath: relPath } });
  return NextResponse.json({ ok: true, receiptPath: relPath });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const tx = await getOwnedTx(session.user.familyId, id);
  if (!tx?.receiptPath) return NextResponse.json({ error: "Không có ảnh" }, { status: 404 });

  const data = await readReceipt(tx.receiptPath);
  if (!data) return NextResponse.json({ error: "Không tìm thấy ảnh" }, { status: 404 });
  return new Response(new Uint8Array(data.buf), {
    status: 200,
    headers: {
      "content-type": data.mime,
      "cache-control": "private, max-age=300",
    },
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const tx = await getOwnedTx(session.user.familyId, id);
  if (!tx) return NextResponse.json({ error: "Không tìm thấy giao dịch" }, { status: 404 });
  if (tx.receiptPath) await deleteReceipt(tx.receiptPath);
  await prisma.transaction.update({ where: { id }, data: { receiptPath: null } });
  return NextResponse.json({ ok: true });
}
