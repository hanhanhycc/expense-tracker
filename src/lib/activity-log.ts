import { prisma } from "@/lib/db";

export type LogInput = {
  familyId: string;
  actorId?: string | null;
  actorName: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "INVITE" | "ROLE_CHANGE" | "SETTLE";
  entity: "saving_goal" | "contribution" | "member" | "invite" | "family" | "profile";
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, unknown> | null;
};

/**
 * Ghi activity log. Không bao giờ throw — log lỗi & nuốt để không phá flow chính.
 */
export async function logActivity(input: LogInput): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        familyId: input.familyId,
        actorId: input.actorId ?? null,
        actorName: input.actorName,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        summary: input.summary,
        metadata: input.metadata ? (input.metadata as object) : undefined,
      },
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[activity-log] ghi log thất bại:", e);
  }
}
