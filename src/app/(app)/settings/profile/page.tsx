import { requireAuth } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { ProfileForm } from "@/features/members/components/profile-form";

export default async function ProfilePage() {
  const session = await requireAuth();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, phone: true },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold tracking-tight px-1">Thông tin cá nhân</h1>
      <ProfileForm initial={{ name: user?.name ?? "", email: user?.email ?? "", phone: user?.phone ?? "" }} />
    </div>
  );
}
