import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Session as NextAuthSession } from "next-auth";

export type Session = NextAuthSession;

export async function requireAuth(): Promise<Session> {
  const session = (await auth()) as Session | null;
  if (!session?.user?.familyId) redirect("/login");
  return session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireAuth();
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    throw new Error("Bạn không có quyền thực hiện hành động này");
  }
  return session;
}
