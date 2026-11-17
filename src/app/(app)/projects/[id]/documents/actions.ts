"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { getProjectAccess } from "@/lib/permissions";
import { fromZodError, type ActionState } from "@/lib/action-state";
import { removeFile, saveFile } from "./storage";
import { validateDocumentFile } from "./file-validation";

const uploadSchema = z.object({
  projectId: z.string().min(1),
  taskId: z.string().optional(),
  file: z.instanceof(File),
});

export async function uploadDocument(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = uploadSchema.safeParse({
    projectId: formData.get("projectId"),
    taskId: String(formData.get("taskId") ?? ""),
    file: formData.get("file"),
  });
  if (!parsed.success) return fromZodError(parsed.error);
  const { file } = parsed.data;
  const fileError = validateDocumentFile(file.name, file.type, file.size);
  if (fileError) {
    return {
      error: fileError,
      fieldErrors: {
        file: [fileError === "This file type is not allowed, or its MIME type does not match the file extension."
          ? "Upload a supported file with a matching MIME type and extension."
          : fileError],
      },
    };
  }

  const access = await getProjectAccess(user, parsed.data.projectId);
  if (!access.isMember) return { error: "You must be a project member to upload documents." };
  const taskId = parsed.data.taskId || undefined;
  if (taskId) {
    const task = await db.task.findFirst({
      where: { id: taskId, projectId: access.project.id },
      select: { id: true },
    });
    if (!task) return { error: "Choose a task in this project." };
  }

  const documentId = randomUUID();
  const storageKey = await saveFile(access.project.id, file.name, new Uint8Array(await file.arrayBuffer()));
  let document;
  try {
    document = await db.document.create({
      data: {
        id: documentId,
        projectId: access.project.id,
        taskId,
        name: file.name,
        url: `/api/documents/${documentId}`,
        storageKey,
        mimeType: file.type,
        size: file.size,
        uploadedById: user.id,
      },
    });
  } catch (error) {
    await removeFile(storageKey);
    throw error;
  }

  await logActivity({
    actorId: user.id,
    projectId: access.project.id,
    action: "document.uploaded",
    entityType: "Document",
    entityId: document.id,
    details: { name: document.name, size: document.size },
  });
  revalidatePath(`/projects/${access.project.id}/documents`);
  return { success: "Document uploaded." };
}

const deleteDocumentSchema = z.object({
  projectId: z.string().min(1),
  documentId: z.string().min(1),
});

export async function deleteDocument(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = deleteDocumentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const access = await getProjectAccess(user, parsed.data.projectId);
  const document = await db.document.findFirst({
    where: { id: parsed.data.documentId, projectId: access.project.id },
    select: { id: true, name: true, storageKey: true, uploadedById: true },
  });
  if (!document) return { error: "Document not found." };
  if (document.uploadedById !== user.id && !access.canManage) {
    return { error: "You can't delete this document." };
  }

  await removeFile(document.storageKey);
  await db.document.delete({ where: { id: document.id, projectId: access.project.id } });
  await logActivity({
    actorId: user.id,
    projectId: access.project.id,
    action: "document.deleted",
    entityType: "Document",
    entityId: document.id,
    details: { name: document.name },
  });
  revalidatePath(`/projects/${access.project.id}/documents`);
  return { success: "Document deleted." };
}
