"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getProjectAccess } from "@/lib/permissions";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { fromZodError, type ActionState } from "@/lib/action-state";

const setStatusSchema = z.object({
  taskId: z.string().min(1),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]),
});

export async function setMyTaskStatus(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const raw = Object.fromEntries(formData);
  const parsed = setStatusSchema.safeParse(raw);
  if (!parsed.success) return fromZodError(parsed.error);

  const task = await db.task.findUnique({
    where: { id: parsed.data.taskId },
    select: { id: true, projectId: true, assigneeId: true, status: true },
  });
  if (!task) return { error: "Task not found." };

  // User must be assignee or project manager
  const access = await getProjectAccess(user, task.projectId);
  if (!access.canManage && task.assigneeId !== user.id) {
    return { error: "You can only update tasks assigned to you." };
  }

  const oldStatus = task.status;
  const newStatus = parsed.data.status;
  const isDone = newStatus === "DONE";
  const statusChanged = oldStatus !== newStatus;

  await db.task.update({
    where: { id: task.id },
    data: {
      status: newStatus,
      completedAt: isDone ? new Date() : null,
    },
  });

  if (statusChanged) {
    await logActivity({
      actorId: user.id,
      projectId: task.projectId,
      action: "task.status_changed",
      entityType: "Task",
      entityId: task.id,
      details: { from: oldStatus, to: newStatus },
    });
  }

  revalidatePath("/tasks");
  revalidatePath(`/projects/${task.projectId}/tasks`);
  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath(`/projects/${task.projectId}/timeline`);
  revalidatePath("/dashboard");

  return { success: "Status updated." };
}
