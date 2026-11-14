import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Record something that happened, for the project activity feed and audit trail.
 * Call it from server actions AFTER the change succeeded.
 *
 * action naming: "<entity>.<verb>", e.g. "task.created", "task.status_changed",
 * "milestone.completed", "expense.added", "document.uploaded", "update.posted".
 */
export async function logActivity(input: {
  actorId: string;
  projectId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  details?: Prisma.InputJsonValue;
}) {
  await db.activityLog.create({
    data: {
      actorId: input.actorId,
      projectId: input.projectId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      details: input.details,
    },
  });
}
