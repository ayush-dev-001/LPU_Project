"use server";

import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getProjectAccess, canEditTask } from "@/lib/permissions";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notifications";
import { fromZodError, type ActionState } from "@/lib/action-state";
import type { TaskStatus } from "@/generated/prisma/enums";

// ─────────────────────────── Zod Schemas ───────────────────────────

const taskSchema = z
  .object({
    projectId: z.string().min(1),
    taskId: z.string().optional(),
    title: z
      .string()
      .trim()
      .min(2, "Title is too short.")
      .max(160, "Title is too long."),
    description: z
      .string()
      .trim()
      .max(5000, "Description is too long.")
      .optional()
      .default(""),
    status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).default("TODO"),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
    assigneeId: z.string().optional().default(""),
    milestoneId: z.string().optional().default(""),
    startDate: z.string().optional().default(""),
    dueDate: z.string().optional().default(""),
  })
  .refine(
    (d) => {
      if (d.startDate && d.dueDate) {
        return new Date(d.dueDate) >= new Date(d.startDate);
      }
      return true;
    },
    {
      message: "Due date must be on or after start date.",
      path: ["dueDate"],
    },
  );

const moveTaskSchema = z.object({
  taskId: z.string().min(1, "Task ID is required."),
  projectId: z.string().min(1, "Project ID is required."),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]),
  position: z.coerce.number().int().min(0, "Position must be a non-negative integer."),
});

// ─────────────────────────── Helper Functions ───────────────────────────

async function validateAssigneeOnProject(projectId: string, managerId: string, assigneeId: string | null) {
  if (!assigneeId) return true;
  const user = await db.user.findFirst({
    where: { id: assigneeId, isActive: true },
    select: { id: true },
  });
  if (!user) return false;
  if (assigneeId === managerId) return true;
  const count = await db.projectMember.count({
    where: { projectId, userId: assigneeId },
  });
  return count > 0;
}

async function validateMilestoneOnProject(projectId: string, milestoneId: string | null) {
  if (!milestoneId) return true;
  const count = await db.milestone.count({
    where: { id: milestoneId, projectId },
  });
  return count > 0;
}

function revalidateProjectAndTasks(projectId: string) {
  revalidatePath(`/projects/${projectId}/tasks`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/timeline`);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

// ─────────────────────────── Create Task ───────────────────────────

export async function createTask(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const raw = Object.fromEntries(formData);
  const parsed = taskSchema.safeParse(raw);
  if (!parsed.success) return fromZodError(parsed.error);

  const access = await getProjectAccess(user, parsed.data.projectId, { manage: true });

  const assigneeId = parsed.data.assigneeId || null;
  const milestoneId = parsed.data.milestoneId || null;

  const validAssignee = await validateAssigneeOnProject(
    access.project.id,
    access.project.managerId,
    assigneeId,
  );
  if (!validAssignee) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: { assigneeId: ["Assignee must be the project manager or a team member."] },
    };
  }

  const validMilestone = await validateMilestoneOnProject(access.project.id, milestoneId);
  if (!validMilestone) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: { milestoneId: ["Milestone does not belong to this project."] },
    };
  }

  // Position is max in target column + 1
  const maxTask = await db.task.findFirst({
    where: { projectId: access.project.id, status: parsed.data.status },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  const position = maxTask ? maxTask.position + 1 : 0;
  const isDone = parsed.data.status === "DONE";

  const task = await db.task.create({
    data: {
      projectId: access.project.id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      status: parsed.data.status,
      priority: parsed.data.priority,
      assigneeId,
      milestoneId,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      completedAt: isDone ? new Date() : null,
      position,
      createdById: user.id,
    },
  });

  await logActivity({
    actorId: user.id,
    projectId: access.project.id,
    action: "task.created",
    entityType: "Task",
    entityId: task.id,
  });

  if (assigneeId) {
    await notify({
      userIds: [assigneeId],
      type: "TASK_ASSIGNED",
      title: "New task assigned",
      message: `${task.title} in ${access.project.name}`,
      link: `/projects/${access.project.id}/tasks`,
      excludeUserId: user.id,
    });
  }

  revalidateProjectAndTasks(access.project.id);
  return { success: "Task created." };
}

// ─────────────────────────── Update Task ───────────────────────────

export async function updateTask(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const raw = Object.fromEntries(formData);
  const projectId = String(raw.projectId || "");
  const taskId = String(raw.taskId || "");
  if (!projectId || !taskId) return { error: "Missing required identifiers." };

  const access = await getProjectAccess(user, projectId);

  const existingTask = await db.task.findFirst({
    where: { id: taskId, projectId: access.project.id },
  });
  if (!existingTask) notFound();

  if (!canEditTask(user, access, existingTask)) {
    return { error: "You don't have permission to edit this task." };
  }

  // Non-managers can ONLY update status and description.
  if (!access.canManage) {
    const memberSchema = z.object({
      status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]),
      description: z.string().trim().max(5000).optional().default(""),
    });
    const parsedMember = memberSchema.safeParse(raw);
    if (!parsedMember.success) return fromZodError(parsedMember.error);

    const isDone = parsedMember.data.status === "DONE";
    const statusChanged = existingTask.status !== parsedMember.data.status;
    const completedAt = statusChanged
      ? (isDone ? new Date() : null)
      : (isDone ? existingTask.completedAt : null);

    if (statusChanged) {
      await db.$transaction(async (tx) => {
        const maxTask = await tx.task.findFirst({
          where: { projectId: access.project.id, status: parsedMember.data.status },
          orderBy: { position: "desc" },
          select: { position: true },
        });
        const freshPosition = maxTask ? maxTask.position + 1 : 0;

        const oldTasks = await tx.task.findMany({
          where: { projectId: access.project.id, status: existingTask.status, id: { not: existingTask.id } },
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
          where: { id: existingTask.id },
          data: {
            status: parsedMember.data.status,
            description: parsedMember.data.description || null,
            position: freshPosition,
            completedAt,
          },
        });
      });

      await logActivity({
        actorId: user.id,
        projectId: access.project.id,
        action: "task.status_changed",
        entityType: "Task",
        entityId: existingTask.id,
        details: { from: existingTask.status, to: parsedMember.data.status },
      });
    } else {
      await db.task.update({
        where: { id: existingTask.id },
        data: {
          description: parsedMember.data.description || null,
          completedAt,
        },
      });
    }

    await logActivity({
      actorId: user.id,
      projectId: access.project.id,
      action: "task.updated",
      entityType: "Task",
      entityId: existingTask.id,
    });

    revalidateProjectAndTasks(access.project.id);
    return { success: "Task updated." };
  }

  // Manager update
  const parsed = taskSchema.safeParse(raw);
  if (!parsed.success) return fromZodError(parsed.error);

  const assigneeId = parsed.data.assigneeId || null;
  const milestoneId = parsed.data.milestoneId || null;

  const validAssignee = await validateAssigneeOnProject(
    access.project.id,
    access.project.managerId,
    assigneeId,
  );
  if (!validAssignee) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: { assigneeId: ["Assignee must be the project manager or a team member."] },
    };
  }

  const validMilestone = await validateMilestoneOnProject(access.project.id, milestoneId);
  if (!validMilestone) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: { milestoneId: ["Milestone does not belong to this project."] },
    };
  }

  const isDone = parsed.data.status === "DONE";
  const statusChanged = existingTask.status !== parsed.data.status;
  const assigneeChanged = existingTask.assigneeId !== assigneeId;
  const completedAt = statusChanged
    ? (isDone ? new Date() : null)
    : (isDone ? existingTask.completedAt : null);

  const taskUpdateData = {
    title: parsed.data.title,
    description: parsed.data.description || null,
    status: parsed.data.status,
    priority: parsed.data.priority,
    assigneeId,
    milestoneId,
    startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
    dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
    completedAt,
  };

  if (statusChanged) {
    await db.$transaction(async (tx) => {
      const maxTask = await tx.task.findFirst({
        where: { projectId: access.project.id, status: parsed.data.status },
        orderBy: { position: "desc" },
        select: { position: true },
      });
      const freshPosition = maxTask ? maxTask.position + 1 : 0;

      const oldTasks = await tx.task.findMany({
        where: { projectId: access.project.id, status: existingTask.status, id: { not: existingTask.id } },
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
        where: { id: existingTask.id },
        data: {
          ...taskUpdateData,
          position: freshPosition,
        },
      });
    });
  } else {
    await db.task.update({
      where: { id: existingTask.id },
      data: taskUpdateData,
    });
  }

  if (assigneeChanged && assigneeId) {
    await logActivity({
      actorId: user.id,
      projectId: access.project.id,
      action: "task.assigned",
      entityType: "Task",
      entityId: existingTask.id,
      details: { assigneeId },
    });

    await notify({
      userIds: [assigneeId],
      type: "TASK_ASSIGNED",
      title: "New task assigned",
      message: `${parsed.data.title} in ${access.project.name}`,
      link: `/projects/${access.project.id}/tasks`,
      excludeUserId: user.id,
    });
  }

  if (statusChanged) {
    await logActivity({
      actorId: user.id,
      projectId: access.project.id,
      action: "task.status_changed",
      entityType: "Task",
      entityId: existingTask.id,
      details: { from: existingTask.status, to: parsed.data.status },
    });
  }

  await logActivity({
    actorId: user.id,
    projectId: access.project.id,
    action: "task.updated",
    entityType: "Task",
    entityId: existingTask.id,
  });

  revalidateProjectAndTasks(access.project.id);
  return { success: "Task updated." };
}

// ─────────────────────────── Move Task (dnd-kit) ───────────────────────────

export async function moveTask(input: {
  taskId: string;
  projectId: string;
  status: TaskStatus;
  position: number;
}): Promise<{ error?: string; success?: boolean }> {
  const user = await requireUser();

  // Validate input parameters with Zod
  const parsed = moveTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Invalid move parameters." };
  }
  const { taskId, projectId, status, position } = parsed.data;

  const access = await getProjectAccess(user, projectId);

  const task = await db.task.findFirst({
    where: { id: taskId, projectId: access.project.id },
  });
  if (!task) return { error: "Task not found." };

  if (!canEditTask(user, access, task)) {
    return { error: "You don't have permission to move this task." };
  }

  const oldStatus = task.status;
  const newStatus = status;
  const isDone = newStatus === "DONE";
  const statusChanged = oldStatus !== newStatus;

  await db.$transaction(async (tx) => {
    if (oldStatus === newStatus) {
      // Re-order inside the same column
      const columnTasks = await tx.task.findMany({
        where: { projectId: access.project.id, status: oldStatus },
        orderBy: { position: "asc" },
        select: { id: true },
      });

      const filtered = columnTasks.filter((t) => t.id !== task.id);
      const targetIndex = Math.max(0, Math.min(position, filtered.length));
      filtered.splice(targetIndex, 0, { id: task.id });

      for (let i = 0; i < filtered.length; i++) {
        await tx.task.update({
          where: { id: filtered[i]!.id },
          data: { position: i },
        });
      }
    } else {
      // Re-order across columns
      // 1. Re-index source column
      const sourceTasks = await tx.task.findMany({
        where: { projectId: access.project.id, status: oldStatus, id: { not: task.id } },
        orderBy: { position: "asc" },
        select: { id: true },
      });
      for (let i = 0; i < sourceTasks.length; i++) {
        await tx.task.update({
          where: { id: sourceTasks[i]!.id },
          data: { position: i },
        });
      }

      // 2. Insert into target column
      const targetTasks = await tx.task.findMany({
        where: { projectId: access.project.id, status: newStatus },
        orderBy: { position: "asc" },
        select: { id: true },
      });
      const targetIndex = Math.max(0, Math.min(position, targetTasks.length));
      targetTasks.splice(targetIndex, 0, { id: task.id });

      for (let i = 0; i < targetTasks.length; i++) {
        if (targetTasks[i]!.id === task.id) {
          await tx.task.update({
            where: { id: task.id },
            data: {
              status: newStatus,
              position: i,
              completedAt: isDone ? new Date() : null,
            },
          });
        } else {
          await tx.task.update({
            where: { id: targetTasks[i]!.id },
            data: { position: i },
          });
        }
      }
    }
  });

  if (statusChanged) {
    await logActivity({
      actorId: user.id,
      projectId: access.project.id,
      action: "task.status_changed",
      entityType: "Task",
      entityId: task.id,
      details: { from: oldStatus, to: newStatus },
    });
  }

  revalidateProjectAndTasks(access.project.id);
  return { success: true };
}

// ─────────────────────────── Delete Task ───────────────────────────

export async function deleteTask(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const raw = Object.fromEntries(formData);
  const projectId = String(raw.projectId || "");
  const taskId = String(raw.taskId || "");
  if (!projectId || !taskId) return { error: "Missing required identifiers." };

  const access = await getProjectAccess(user, projectId, { manage: true });

  const task = await db.task.findFirst({
    where: { id: taskId, projectId: access.project.id },
  });
  if (!task) notFound();

  await db.$transaction(async (tx) => {
    await tx.task.delete({ where: { id: task.id } });

    // Re-index remaining tasks in this column
    const remaining = await tx.task.findMany({
      where: { projectId: access.project.id, status: task.status },
      orderBy: { position: "asc" },
      select: { id: true },
    });
    for (let i = 0; i < remaining.length; i++) {
      await tx.task.update({
        where: { id: remaining[i]!.id },
        data: { position: i },
      });
    }
  });

  await logActivity({
    actorId: user.id,
    projectId: access.project.id,
    action: "task.deleted",
    entityType: "Task",
    entityId: task.id,
  });

  revalidateProjectAndTasks(access.project.id);
  return { success: "Task deleted." };
}
