import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { FamilyForm } from "@/features/members/components/family-form";

export default async function FamilySettingsPage() {
  const session = await requireAuth();
  if (session.user.role !== "OWNER") redirect("/settings");

  const family = await prisma.family.findUnique({
    where: { id: session.user.familyId },
    select: { id: true, name: true, createdAt: true },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Thông tin gia đình</h1>
      <FamilyForm initial={{ name: family?.name ?? "" }} />
    </div>
  );
}
