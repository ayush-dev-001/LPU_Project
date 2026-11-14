"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import type { ActionState } from "@/lib/action-state";

const updateUserSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["ADMIN", "MANAGER", "MEMBER"]),
  isActive: z.enum(["true", "false"]).transform((v) => v === "true"),
});

export async function updateUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const parsed = updateUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid input." };
  const { userId, role, isActive } = parsed.data;

  if (userId === admin.id && (role !== "ADMIN" || !isActive)) {
    return { error: "You can't remove your own admin access or deactivate yourself." };
  }

  const before = await db.user.findUnique({ where: { id: userId }, select: { role: true, isActive: true } });
  if (!before) return { error: "User not found." };

  await db.user.update({ where: { id: userId }, data: { role, isActive } });
  await logActivity({
    actorId: admin.id,
    action: "user.updated",
    entityType: "User",
    entityId: userId,
    details: { from: before, to: { role, isActive } },
  });

  revalidatePath("/admin/users");
  return { success: "Saved." };
}
