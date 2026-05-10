import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export type Session = NonNullable<Awaited<ReturnType<typeof auth>>>;

export async function requireAuth(): Promise<Session> {
  const session = await auth();
  if (!session?.user?.familyId) redirect("/login");
  return session as Session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireAuth();
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    throw new Error("Bạn không có quyền thực hiện hành động này");
  }
  return session;
}
