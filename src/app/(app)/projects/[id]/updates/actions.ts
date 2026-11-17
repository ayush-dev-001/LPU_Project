"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notifications";
import { getProjectAccess } from "@/lib/permissions";
import { fromZodError, type ActionState } from "@/lib/action-state";

const postUpdateSchema = z.object({
  projectId: z.string().min(1),
  summary: z.string().trim().min(5, "Please enter at least 5 characters.").max(2000, "Summary must be 2000 characters or fewer."),
  blockers: z.string().trim().max(1000, "Blockers must be 1000 characters or fewer.").optional().default(""),
  percentComplete: z.preprocess(
    (value) => (value === "" || value === undefined ? undefined : Number(value)),
    z.number().int().min(0).max(100).optional(),
  ),
});

export async function postUpdate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = postUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const access = await getProjectAccess(user, parsed.data.projectId);
  if (!access.isMember) return { error: "You must be a project member to post an update." };

  const update = await db.progressUpdate.create({
    data: {
      projectId: access.project.id,
      authorId: user.id,
      summary: parsed.data.summary,
      blockers: parsed.data.blockers || null,
      percentComplete: parsed.data.percentComplete ?? null,
    },
  });

  await logActivity({
    actorId: user.id,
    projectId: access.project.id,
    action: "update.posted",
    entityType: "ProgressUpdate",
    entityId: update.id,
  });

  if (parsed.data.blockers) {
    await notify({
      userIds: [access.project.managerId],
      type: "PROJECT_UPDATE",
      title: "Blocker reported",
      message: `${user.name} on ${access.project.name}: ${parsed.data.blockers.slice(0, 100)}`,
      link: `/projects/${access.project.id}/updates`,
      excludeUserId: user.id,
    });
  }

  revalidatePath(`/projects/${access.project.id}/updates`);
  revalidatePath("/updates");
  return { success: "Update posted." };
}

const deleteUpdateSchema = z.object({
  updateId: z.string().min(1),
  projectId: z.string().min(1),
});

export async function deleteUpdate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = deleteUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const access = await getProjectAccess(user, parsed.data.projectId);
  const update = await db.progressUpdate.findFirst({
    where: { id: parsed.data.updateId, projectId: access.project.id },
    select: { id: true, authorId: true },
  });
  if (!update) return { error: "Update not found." };
  if (update.authorId !== user.id && !access.canManage) {
    return { error: "You can't delete this update." };
  }

  await db.progressUpdate.delete({ where: { id: update.id, projectId: access.project.id } });
  await logActivity({
    actorId: user.id,
    projectId: access.project.id,
    action: "update.deleted",
    entityType: "ProgressUpdate",
    entityId: update.id,
  });

  revalidatePath(`/projects/${access.project.id}/updates`);
  revalidatePath("/updates");
  return { success: "Update deleted." };
}
