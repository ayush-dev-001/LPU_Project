"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getProjectAccess } from "@/lib/permissions";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notifications";
import { fromZodError, type ActionState } from "@/lib/action-state";

/** Empty text fields arrive as "" — store them as null. */
const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((v) => (v ? v : null));

const postSchema = z.object({
  projectId: z.string().min(1),
  summary: z
    .string()
    .trim()
    .min(5, "Write at least 5 characters.")
    .max(2000, "Keep it under 2000 characters."),
  blockers: optionalText(1000, "Keep it under 1000 characters."),
  percentComplete: z
    .string()
    .trim()
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      const n = Number(v);
      if (!Number.isInteger(n) || n < 0 || n > 100) {
        ctx.addIssue({ code: "custom", message: "Enter a whole number from 0 to 100." });
        return z.NEVER;
      }
      return n;
    }),
});

function revalidateUpdates(projectId: string) {
  revalidatePath(`/projects/${projectId}/updates`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/updates");
  revalidatePath("/dashboard");
}

export async function postUpdate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = postSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const access = await getProjectAccess(user, parsed.data.projectId);
  if (!access.isMember) return { error: "Only people on this project can post updates." };

  const { summary, blockers, percentComplete } = parsed.data;
  const update = await db.progressUpdate.create({
    data: { projectId: access.project.id, authorId: user.id, summary, blockers, percentComplete },
  });

  await logActivity({
    actorId: user.id,
    projectId: access.project.id,
    action: "update.posted",
    entityType: "ProgressUpdate",
    entityId: update.id,
    details: { hasBlockers: Boolean(blockers) },
  });

  if (blockers) {
    await notify({
      userIds: [access.project.managerId],
      type: "PROJECT_UPDATE",
      title: "Blocker reported",
      message: `${user.name} on ${access.project.name}: ${blockers.slice(0, 100)}`,
      link: `/projects/${access.project.id}/updates`,
      excludeUserId: user.id,
    });
  }

  revalidateUpdates(access.project.id);
  return { success: "Update posted." };
}

const deleteSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
});

export async function deleteUpdate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = deleteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Something went wrong. Refresh and try again." };

  const access = await getProjectAccess(user, parsed.data.projectId);
  const update = await db.progressUpdate.findFirst({
    where: { id: parsed.data.id, projectId: access.project.id },
    select: { id: true, authorId: true },
  });
  if (!update) return { error: "This update no longer exists." };
  if (update.authorId !== user.id && !access.canManage) {
    return { error: "You can only delete your own updates." };
  }

  await db.progressUpdate.deleteMany({ where: { id: update.id, projectId: access.project.id } });

  await logActivity({
    actorId: user.id,
    projectId: access.project.id,
    action: "update.deleted",
    entityType: "ProgressUpdate",
    entityId: update.id,
  });

  revalidateUpdates(access.project.id);
  return { success: "Update deleted." };
}
