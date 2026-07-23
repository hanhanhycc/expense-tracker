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

/**
 * Quyền tất toán: sổ CHUNG thì mọi thành viên được chia sổ đều tất toán được
 * (ngoài OWNER/ADMIN/người tạo); sổ PERSONAL chỉ người tạo.
 */
export function canSettleGoal(
  session: { user: { role: string; memberId: string } },
  goal: { createdById: string; visibility: Visibility; memberIds: string[] },
): boolean {
  if (goal.visibility === Visibility.PERSONAL) {
    return session.user.memberId === goal.createdById;
  }
  return canManageGoal(session, goal) || goal.memberIds.includes(session.user.memberId);
}
