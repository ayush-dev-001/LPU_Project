"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getProjectAccess, canEditTask } from "@/lib/permissions";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { fromZodError, type ActionState } from "@/lib/action-state";

const setStatusSchema = z.object({
  taskId: z.string().min(1, "Task ID is required."),
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
    select: {
      id: true,
      projectId: true,
      assigneeId: true,
      status: true,
      completedAt: true,
      position: true,
    },
  });
  if (!task) return { error: "Task not found." };

  const access = await getProjectAccess(user, task.projectId);
  if (!canEditTask(user, access, task)) {
    return { error: "You don't have permission to update this task." };
  }

  const oldStatus = task.status;
  const newStatus = parsed.data.status;
  const isDone = newStatus === "DONE";
  const statusChanged = oldStatus !== newStatus;

  // Keep original completedAt if task is already DONE and status hasn't changed
  const completedAt = statusChanged
    ? (isDone ? new Date() : null)
    : (isDone ? task.completedAt : null);

  if (statusChanged) {
    await db.$transaction(async (tx) => {
      // Give fresh position at the end of the new column
      const maxTask = await tx.task.findFirst({
        where: { projectId: task.projectId, status: newStatus },
        orderBy: { position: "desc" },
        select: { position: true },
      });
      const freshPosition = maxTask ? maxTask.position + 1 : 0;

      // Re-index remaining tasks in the old column
      const oldTasks = await tx.task.findMany({
        where: {
          projectId: task.projectId,
          status: oldStatus,
          id: { not: task.id },
        },
        orderBy: { position: "asc" },
        select: { id: true },
      });
      for (let i = 0; i < oldTasks.length; i++) {
        await tx.task.update({
          where: { id: oldTasks[i]!.id },
          data: { position: i },
        });
      }

      await tx.task.update({
        where: { id: task.id },
        data: {
          status: newStatus,
          position: freshPosition,
          completedAt,
        },
      });
    });

    await logActivity({
      actorId: user.id,
      projectId: task.projectId,
      action: "task.status_changed",
      entityType: "Task",
      entityId: task.id,
      details: { from: oldStatus, to: newStatus },
    });
  } else {
    await db.task.update({
      where: { id: task.id },
      data: {
        status: newStatus,
        completedAt,
      },
    });
  }

  revalidatePath("/tasks");
  revalidatePath(`/projects/${task.projectId}/tasks`);
  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath(`/projects/${task.projectId}/timeline`);
  revalidatePath("/dashboard");

  return { success: "Status updated." };
}
