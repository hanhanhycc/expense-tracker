import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readAvatar } from "@/lib/upload";

// Trả ảnh avatar của một thành viên (theo memberId), bắt buộc cùng family
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.familyId) return new NextResponse(null, { status: 401 });
  const { id } = await params;
  const member = await prisma.familyMember.findFirst({
    where: { id, familyId: session.user.familyId },
    select: { user: { select: { avatarPath: true } } },
  });
  if (!member?.user.avatarPath) return new NextResponse(null, { status: 404 });
  const file = await readAvatar(member.user.avatarPath);
  if (!file) return new NextResponse(null, { status: 404 });
  return new NextResponse(file.buf as unknown as BodyInit, {
    status: 200,
    headers: {
      "content-type": file.mime,
      "cache-control": "private, max-age=0, must-revalidate",
    },
  });
}
