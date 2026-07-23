import { Visibility } from "@prisma/client";

/** OWNER/ADMIN HOẶC người tạo goal — nhưng nếu PERSONAL thì CHỈ người tạo */
export function canManageGoal(
  session: { user: { role: string; memberId: string } },
  goal: { createdById: string; visibility: Visibility },
): boolean {
  if (goal.visibility === Visibility.PERSONAL) {
    return session.user.memberId === goal.createdById;
  }
  return (
    session.user.role === "OWNER" ||
    session.user.role === "ADMIN" ||
    session.user.memberId === goal.createdById
  );
}
