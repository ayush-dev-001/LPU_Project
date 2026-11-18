"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getProjectAccess } from "@/lib/permissions";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { fromZodError, type ActionState } from "@/lib/action-state";
import { validateDocumentFile } from "./file-validation";
import { removeFile, saveFile } from "./storage";

const uploadSchema = z.object({
  projectId: z.string().min(1),
  taskId: z
    .string()
    .optional()
    .transform((v) => (v ? v : null)),
});

export async function uploadDocument(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = uploadSchema.safeParse({
    projectId: formData.get("projectId"),
    taskId: formData.get("taskId") ?? undefined,
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { error: "Choose a file to upload.", fieldErrors: { file: ["Choose a file to upload."] } };
  }
  const fileError = validateDocumentFile(file.name, file.type, file.size);
  if (fileError) {
    return { error: fileError, fieldErrors: { file: [fileError] } };
  }

  const access = await getProjectAccess(user, parsed.data.projectId);
  if (!access.isMember) return { error: "Only people on this project can upload documents." };

  const { taskId } = parsed.data;
  if (taskId) {
    const task = await db.task.findFirst({ where: { id: taskId, projectId: access.project.id }, select: { id: true } });
    if (!task) return { error: "That task isn't part of this project.", fieldErrors: { taskId: ["Pick a task from this project."] } };
  }

  const storageKey = await saveFile(access.project.id, file.name, Buffer.from(await file.arrayBuffer()));
  let documentId: string;
  try {
    const doc = await db.document.create({
      data: {
        projectId: access.project.id,
        taskId,
        name: file.name.slice(0, 200),
        url: "",
        storageKey,
        mimeType: file.type,
        size: file.size,
        uploadedById: user.id,
      },
      select: { id: true },
    });
    documentId = doc.id;
    await db.document.update({ where: { id: documentId }, data: { url: `/api/documents/${documentId}` } });
  } catch (err) {
    await removeFile(storageKey).catch(() => {});
    throw err;
  }

  await logActivity({
    actorId: user.id,
    projectId: access.project.id,
    action: "document.uploaded",
    entityType: "Document",
    entityId: documentId,
    details: { name: file.name, size: file.size },
  });

  revalidatePath(`/projects/${access.project.id}/documents`);
  return { success: `Uploaded ${file.name}.` };
}

const deleteSchema = z.object({ id: z.string().min(1), projectId: z.string().min(1) });

export async function deleteDocument(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = deleteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Something went wrong. Refresh and try again." };

  const access = await getProjectAccess(user, parsed.data.projectId);
  const doc = await db.document.findFirst({
    where: { id: parsed.data.id, projectId: access.project.id },
    select: { id: true, name: true, storageKey: true, uploadedById: true },
  });
  if (!doc) return { error: "This document no longer exists." };
  if (doc.uploadedById !== user.id && !access.canManage) {
    return { error: "Only the uploader or a manager can delete this document." };
  }

  await db.document.deleteMany({ where: { id: doc.id, projectId: access.project.id } });
  // The row is gone either way; a file already missing from disk is fine.
  await removeFile(doc.storageKey).catch(() => {});

  await logActivity({
    actorId: user.id,
    projectId: access.project.id,
    action: "document.deleted",
    entityType: "Document",
    entityId: doc.id,
    details: { name: doc.name },
  });

  revalidatePath(`/projects/${access.project.id}/documents`);
  return { success: "Document deleted." };
}
