"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { canCreateProject, getProjectAccess } from "@/lib/permissions";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notifications";
import { fromZodError, type ActionState } from "@/lib/action-state";

// ─── Shared schema for create & update ───

const projectSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, "Name must be at least 3 characters.")
      .max(120, "Name must be at most 120 characters."),
    code: z
      .string()
      .trim()
      .regex(/^[A-Z]{2,5}-\d{3,5}$/, "Code must match a format like PRJ-001."),
    description: z
      .string()
      .trim()
      .max(2000, "Description is too long.")
      .optional()
      .default(""),
    status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]),
    startDate: z.string().min(1, "Start date is required."),
    endDate: z.string().min(1, "End date is required."),
    budget: z.coerce
      .number()
      .int("Budget must be a whole number.")
      .min(0, "Budget cannot be negative."),
    managerId: z.string().min(1, "Manager is required."),
  })
  .refine((d) => new Date(d.endDate) >= new Date(d.startDate), {
    message: "End date must be on or after the start date.",
    path: ["endDate"],
  });

// ─── Create ───

export async function createProject(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!canCreateProject(user))
    return { error: "You don't have permission to create projects." };

  const raw = Object.fromEntries(formData);
  const memberIds = formData.getAll("memberIds").filter(Boolean).map(String);
  const parsed = projectSchema.safeParse(raw);
  if (!parsed.success) return fromZodError(parsed.error);

  // Unique code check
  const dup = await db.project.findFirst({
    where: { code: parsed.data.code },
  });
  if (dup) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: { code: ["This code is already taken."] },
    };
  }

  // MANAGER can only manage their own projects
  const managerId =
    user.role === "ADMIN" ? parsed.data.managerId : user.id;

  const project = await db.project.create({
    data: {
      name: parsed.data.name,
      code: parsed.data.code,
      description: parsed.data.description || null,
      status: parsed.data.status,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
      budget: parsed.data.budget,
      managerId,
      members: {
        create: memberIds
          .filter((id) => id !== managerId)
          .map((userId) => ({ userId })),
      },
    },
  });

  await logActivity({
    actorId: user.id,
    projectId: project.id,
    action: "project.created",
    entityType: "Project",
    entityId: project.id,
  });

  await notify({
    userIds: memberIds,
    type: "PROJECT_UPDATE",
    title: "Added to project",
    message: `You were added to ${parsed.data.name}`,
    link: `/projects/${project.id}`,
    excludeUserId: user.id,
  });

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  redirect(`/projects/${project.id}`);
}

// ─── Update ───

export async function updateProject(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const raw = Object.fromEntries(formData);
  const memberIds = formData.getAll("memberIds").filter(Boolean).map(String);
  const projectId = String(raw.projectId || "");
  if (!projectId) return { error: "Missing project ID." };

  const parsed = projectSchema.safeParse(raw);
  if (!parsed.success) return fromZodError(parsed.error);

  const access = await getProjectAccess(user, projectId, { manage: true });

  // Unique code check (excluding current project)
  const dup = await db.project.findFirst({
    where: { code: parsed.data.code, id: { not: access.project.id } },
  });
  if (dup) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: { code: ["This code is already taken."] },
    };
  }

  const managerId =
    user.role === "ADMIN" ? parsed.data.managerId : user.id;

  // Diff members
  const currentMembers = await db.projectMember.findMany({
    where: { projectId: access.project.id },
    select: { userId: true },
  });
  const currentIds = new Set(currentMembers.map((m) => m.userId));
  const wantedIds = new Set(memberIds.filter((id) => id !== managerId));
  const toAdd = [...wantedIds].filter((id) => !currentIds.has(id));
  const toRemove = [...currentIds].filter((id) => !wantedIds.has(id));

  await db.$transaction(async (tx) => {
    await tx.project.update({
      where: { id: access.project.id },
      data: {
        name: parsed.data.name,
        code: parsed.data.code,
        description: parsed.data.description || null,
        status: parsed.data.status,
        startDate: new Date(parsed.data.startDate),
        endDate: new Date(parsed.data.endDate),
        budget: parsed.data.budget,
        managerId,
      },
    });
    if (toRemove.length > 0) {
      await tx.projectMember.deleteMany({
        where: { projectId: access.project.id, userId: { in: toRemove } },
      });
    }
    if (toAdd.length > 0) {
      await tx.projectMember.createMany({
        data: toAdd.map((userId) => ({
          projectId: access.project.id,
          userId,
        })),
      });
    }
  });

  await logActivity({
    actorId: user.id,
    projectId: access.project.id,
    action: "project.updated",
    entityType: "Project",
    entityId: access.project.id,
  });

  if (toAdd.length > 0) {
    await notify({
      userIds: toAdd,
      type: "PROJECT_UPDATE",
      title: "Added to project",
      message: `You were added to ${parsed.data.name}`,
      link: `/projects/${access.project.id}`,
      excludeUserId: user.id,
    });
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${access.project.id}`);
  revalidatePath("/dashboard");
  return { success: "Project updated." };
}

// ─── Delete ───

const deleteSchema = z.object({
  projectId: z.string().min(1),
  confirmCode: z.string().min(1, "Type the project code to confirm."),
});

export async function deleteProject(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = deleteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const access = await getProjectAccess(user, parsed.data.projectId, {
    manage: true,
  });

  if (parsed.data.confirmCode !== access.project.code) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: {
        confirmCode: ["The code doesn't match. Type it exactly."],
      },
    };
  }

  await db.project.delete({ where: { id: access.project.id } });

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  redirect("/projects");
}
