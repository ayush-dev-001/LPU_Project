"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getProjectAccess } from "@/lib/permissions";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notifications";
import { fromZodError, type ActionState } from "@/lib/action-state";

// ─────────────────────────── Members ──────────────────────────────

const addMemberSchema = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1, "Select a user."),
});

export async function addMember(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = addMemberSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const access = await getProjectAccess(user, parsed.data.projectId, {
    manage: true,
  });

  // Cannot add the project manager as a member
  if (parsed.data.userId === access.project.managerId) {
    return { error: "The project manager is already on the project." };
  }

  // Confirm user exists and is active
  const targetUser = await db.user.findFirst({
    where: { id: parsed.data.userId, isActive: true },
    select: { id: true, name: true },
  });
  if (!targetUser) {
    return { error: "User not found or is inactive." };
  }

  const existing = await db.projectMember.findFirst({
    where: {
      projectId: access.project.id,
      userId: parsed.data.userId,
    },
  });
  if (existing)
    return { error: "User is already a member of this project." };

  await db.projectMember.create({
    data: { projectId: access.project.id, userId: parsed.data.userId },
  });

  await logActivity({
    actorId: user.id,
    projectId: access.project.id,
    action: "member.added",
    entityType: "ProjectMember",
    entityId: parsed.data.userId,
  });

  await notify({
    userIds: [parsed.data.userId],
    type: "PROJECT_UPDATE",
    title: "Added to project",
    message: `You were added to ${access.project.name}`,
    link: `/projects/${access.project.id}`,
    excludeUserId: user.id,
  });

  revalidatePath(`/projects/${access.project.id}`);
  return { success: "Member added." };
}

const removeMemberSchema = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
});

export async function removeMember(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = removeMemberSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const access = await getProjectAccess(user, parsed.data.projectId, {
    manage: true,
  });

  await db.projectMember.deleteMany({
    where: { projectId: access.project.id, userId: parsed.data.userId },
  });

  await logActivity({
    actorId: user.id,
    projectId: access.project.id,
    action: "member.removed",
    entityType: "ProjectMember",
    entityId: parsed.data.userId,
  });

  revalidatePath(`/projects/${access.project.id}`);
  return { success: "Member removed." };
}

// ─────────────────────────── Milestones ──────────────────────────────

const milestoneSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().trim().min(2, "Title is too short.").max(120),
  description: z
    .string()
    .trim()
    .max(2000, "Description is too long.")
    .optional()
    .default(""),
  dueDate: z.string().min(1, "Due date is required."),
});

export async function createMilestone(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = milestoneSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const access = await getProjectAccess(user, parsed.data.projectId, {
    manage: true,
  });

  const milestone = await db.milestone.create({
    data: {
      projectId: access.project.id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      dueDate: new Date(parsed.data.dueDate),
    },
  });

  await logActivity({
    actorId: user.id,
    projectId: access.project.id,
    action: "milestone.created",
    entityType: "Milestone",
    entityId: milestone.id,
  });

  revalidatePath(`/projects/${access.project.id}`);
  revalidatePath("/dashboard");
  return { success: "Milestone created." };
}

const updateMilestoneSchema = z.object({
  projectId: z.string().min(1),
  milestoneId: z.string().min(1),
  title: z.string().trim().min(2, "Title is too short.").max(120),
  description: z
    .string()
    .trim()
    .max(2000, "Description is too long.")
    .optional()
    .default(""),
  dueDate: z.string().min(1, "Due date is required."),
});

export async function updateMilestone(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = updateMilestoneSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const access = await getProjectAccess(user, parsed.data.projectId, {
    manage: true,
  });

  await db.milestone.update({
    where: { id: parsed.data.milestoneId, projectId: access.project.id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      dueDate: new Date(parsed.data.dueDate),
    },
  });

  await logActivity({
    actorId: user.id,
    projectId: access.project.id,
    action: "milestone.updated",
    entityType: "Milestone",
    entityId: parsed.data.milestoneId,
  });

  revalidatePath(`/projects/${access.project.id}`);
  return { success: "Milestone updated." };
}

const toggleMilestoneSchema = z.object({
  projectId: z.string().min(1),
  milestoneId: z.string().min(1),
  completed: z.enum(["true", "false"]),
});

export async function toggleMilestone(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = toggleMilestoneSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const access = await getProjectAccess(user, parsed.data.projectId, {
    manage: true,
  });

  const completing = parsed.data.completed === "true";

  await db.milestone.update({
    where: { id: parsed.data.milestoneId, projectId: access.project.id },
    data: {
      status: completing ? "COMPLETED" : "PENDING",
      completedAt: completing ? new Date() : null,
    },
  });

  await logActivity({
    actorId: user.id,
    projectId: access.project.id,
    action: completing ? "milestone.completed" : "milestone.reopened",
    entityType: "Milestone",
    entityId: parsed.data.milestoneId,
  });

  revalidatePath(`/projects/${access.project.id}`);
  revalidatePath("/dashboard");
  return { success: completing ? "Milestone completed." : "Milestone reopened." };
}

const deleteMilestoneSchema = z.object({
  projectId: z.string().min(1),
  milestoneId: z.string().min(1),
});

export async function deleteMilestone(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = deleteMilestoneSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const access = await getProjectAccess(user, parsed.data.projectId, {
    manage: true,
  });

  await db.milestone.delete({
    where: { id: parsed.data.milestoneId, projectId: access.project.id },
  });

  await logActivity({
    actorId: user.id,
    projectId: access.project.id,
    action: "milestone.deleted",
    entityType: "Milestone",
    entityId: parsed.data.milestoneId,
  });

  revalidatePath(`/projects/${access.project.id}`);
  revalidatePath("/dashboard");
  return { success: "Milestone deleted." };
}
