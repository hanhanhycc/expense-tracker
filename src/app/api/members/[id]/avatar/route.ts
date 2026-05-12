import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readAvatar } from "@/lib/upload";
import { getPresetFromPath, isPresetPath, renderPresetSvg } from "@/lib/avatar-presets";

// Trả ảnh avatar của một thành viên (theo memberId), bắt buộc cùng family
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.familyId) return new NextResponse(null, { status: 401 });
  const { id } = await params;
  const member = await prisma.familyMember.findFirst({
    where: { id, familyId: session.user.familyId },
    select: { user: { select: { avatarPath: true } } },
  });
  const avatarPath = member?.user.avatarPath;
  if (!avatarPath) return new NextResponse(null, { status: 404 });

  if (isPresetPath(avatarPath)) {
    const preset = getPresetFromPath(avatarPath);
    if (!preset) return new NextResponse(null, { status: 404 });
    return new NextResponse(renderPresetSvg(preset), {
      status: 200,
      headers: {
        "content-type": "image/svg+xml; charset=utf-8",
        "cache-control": "private, max-age=0, must-revalidate",
      },
    });
  }

  const file = await readAvatar(avatarPath);
  if (!file) return new NextResponse(null, { status: 404 });
  return new NextResponse(file.buf as unknown as BodyInit, {
    status: 200,
    headers: {
      "content-type": file.mime,
      "cache-control": "private, max-age=0, must-revalidate",
    },
  });
}
