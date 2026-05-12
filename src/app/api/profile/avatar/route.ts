import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  AVATAR_MAX_BYTES,
  deleteAvatar,
  isAllowedAvatarMime,
  readAvatar,
  saveAvatar,
} from "@/lib/upload";
import {
  getPresetByKey,
  getPresetFromPath,
  isPresetPath,
  PRESET_PREFIX,
  renderPresetSvg,
} from "@/lib/avatar-presets";
import { logActivity } from "@/lib/activity-log";

// Trả ảnh avatar của chính user đang đăng nhập
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { avatarPath: true },
  });
  if (!user?.avatarPath) return new NextResponse(null, { status: 404 });

  if (isPresetPath(user.avatarPath)) {
    const preset = getPresetFromPath(user.avatarPath);
    if (!preset) return new NextResponse(null, { status: 404 });
    return new NextResponse(renderPresetSvg(preset), {
      status: 200,
      headers: {
        "content-type": "image/svg+xml; charset=utf-8",
        "cache-control": "private, max-age=0, must-revalidate",
      },
    });
  }

  const file = await readAvatar(user.avatarPath);
  if (!file) return new NextResponse(null, { status: 404 });
  return new NextResponse(file.buf as unknown as BodyInit, {
    status: 200,
    headers: {
      "content-type": file.mime,
      "cache-control": "private, max-age=0, must-revalidate",
    },
  });
}

const presetSchema = z.object({ preset: z.string().min(1).max(40) });

// PUT: chọn 1 preset (động vật) làm avatar
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = presetSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });

  const preset = getPresetByKey(parsed.data.preset);
  if (!preset) return NextResponse.json({ error: "Preset không tồn tại" }, { status: 400 });

  // Xoá file ảnh nếu đang dùng file upload
  const current = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { avatarPath: true },
  });
  if (current?.avatarPath && !isPresetPath(current.avatarPath)) {
    await deleteAvatar(current.avatarPath);
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { avatarPath: `${PRESET_PREFIX}${preset.key}` },
  });

  if (session.user.familyId) {
    await logActivity({
      familyId: session.user.familyId,
      actorId: session.user.id,
      actorName: session.user.name || session.user.email,
      action: "UPDATE",
      entity: "profile",
      entityId: session.user.id,
      summary: `Đổi ảnh đại diện sang ${preset.label} ${preset.emoji}`,
    });
  }

  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Thiếu file" }, { status: 400 });
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return NextResponse.json({ error: "File quá lớn (tối đa 4MB)" }, { status: 413 });
  }
  if (!isAllowedAvatarMime(file.type)) {
    return NextResponse.json({ error: "Định dạng không hỗ trợ (jpg/png/webp)" }, { status: 415 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const stored = await saveAvatar(session.user.id, buf, file.type);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { avatarPath: stored },
  });

  if (session.user.familyId) {
    await logActivity({
      familyId: session.user.familyId,
      actorId: session.user.id,
      actorName: session.user.name || session.user.email,
      action: "UPDATE",
      entity: "profile",
      entityId: session.user.id,
      summary: "Cập nhật ảnh đại diện",
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { avatarPath: true },
  });
  if (user?.avatarPath) {
    if (!isPresetPath(user.avatarPath)) {
      await deleteAvatar(user.avatarPath);
    }
    await prisma.user.update({
      where: { id: session.user.id },
      data: { avatarPath: null },
    });
  }
  return NextResponse.json({ ok: true });
}
