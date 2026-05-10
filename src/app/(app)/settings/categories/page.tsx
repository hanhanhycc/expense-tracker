import { requireAuth } from "@/lib/guards";
import { CategoriesClient } from "@/features/categories/components/categories-client";

export default async function CategoriesPage() {
  const session = await requireAuth();
  const canManage = session.user.role === "OWNER" || session.user.role === "ADMIN";
  return <CategoriesClient canManage={canManage} />;
}
