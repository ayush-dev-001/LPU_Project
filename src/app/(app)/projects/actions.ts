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

function isP2002Error(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "P2002"
  );
}

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

  // MANAGER can only manage their own projects; ADMIN can assign manager
  const managerId =
    user.role === "ADMIN" ? parsed.data.managerId : user.id;

  // Validate manager is active and has role MANAGER or ADMIN
  const manager = await db.user.findFirst({
    where: {
      id: managerId,
      isActive: true,
      role: { in: ["MANAGER", "ADMIN"] },
    },
    select: { id: true },
  });
  if (!manager) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: { managerId: ["Selected manager must be an active manager or admin."] },
    };
  }

  // Validate candidate members are active users
  const candidateMemberIds = memberIds.filter((id) => id !== managerId);
  if (candidateMemberIds.length > 0) {
    const activeMembers = await db.user.findMany({
      where: { id: { in: candidateMemberIds }, isActive: true },
      select: { id: true },
    });
    if (activeMembers.length !== candidateMemberIds.length) {
      return {
        error: "One or more selected team members are invalid or inactive.",
      };
    }
  }

  // Unique code check before insert
  const dup = await db.project.findFirst({
    where: { code: parsed.data.code },
  });
  if (dup) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: { code: ["This code is already taken."] },
    };
  }

  let createdProjectId = "";

  try {
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
          create: candidateMemberIds.map((userId) => ({ userId })),
        },
      },
    });
    createdProjectId = project.id;

    await logActivity({
      actorId: user.id,
      projectId: project.id,
      action: "project.created",
      entityType: "Project",
      entityId: project.id,
    });

    await notify({
      userIds: candidateMemberIds,
      type: "PROJECT_UPDATE",
      title: "Added to project",
      message: `You were added to ${parsed.data.name}`,
      link: `/projects/${project.id}`,
      excludeUserId: user.id,
    });
  } catch (err: unknown) {
    if (isP2002Error(err)) {
      return {
        error: "Please fix the highlighted fields.",
        fieldErrors: { code: ["This code is already taken."] },
      };
    }
    throw err;
  }

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  redirect(`/projects/${createdProjectId}`);
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

  const managerId =
    user.role === "ADMIN" ? parsed.data.managerId : user.id;

  // Validate manager is active and has role MANAGER or ADMIN
  const manager = await db.user.findFirst({
    where: {
      id: managerId,
      isActive: true,
      role: { in: ["MANAGER", "ADMIN"] },
    },
    select: { id: true },
  });
  if (!manager) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: { managerId: ["Selected manager must be an active manager or admin."] },
    };
  }

  // Validate candidate members are active users
  const candidateMemberIds = memberIds.filter((id) => id !== managerId);
  if (candidateMemberIds.length > 0) {
    const activeMembers = await db.user.findMany({
      where: { id: { in: candidateMemberIds }, isActive: true },
      select: { id: true },
    });
    if (activeMembers.length !== candidateMemberIds.length) {
      return {
        error: "One or more selected team members are invalid or inactive.",
      };
    }
  }

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

  // Diff members
  const currentMembers = await db.projectMember.findMany({
    where: { projectId: access.project.id },
    select: { userId: true },
  });
  const currentIds = new Set(currentMembers.map((m) => m.userId));
  const wantedIds = new Set(candidateMemberIds);
  const toAdd = [...wantedIds].filter((id) => !currentIds.has(id));
  const toRemove = [...currentIds].filter((id) => !wantedIds.has(id));

  try {
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
  } catch (err: unknown) {
    if (isP2002Error(err)) {
      return {
        error: "Please fix the highlighted fields.",
        fieldErrors: { code: ["This code is already taken."] },
      };
    }
    throw err;
  }

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
