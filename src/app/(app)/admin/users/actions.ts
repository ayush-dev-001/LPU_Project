"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { fromZodError, type ActionState } from "@/lib/action-state";
import { generateTempPassword } from "@/lib/passwords";

/** Result that can carry a one-time temporary password to show the admin. */
export type UserActionState = (NonNullable<ActionState> & { tempPassword?: string; forName?: string }) | undefined;

const createUserSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80),
  email: z.email("Enter a valid email.").trim().toLowerCase(),
  role: z.enum(["ADMIN", "MANAGER", "MEMBER"]),
});

export async function createUser(_prev: UserActionState, formData: FormData): Promise<UserActionState> {
  const admin = await requireRole("ADMIN");
  const parsed = createUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const exists = await db.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
  if (exists) return { fieldErrors: { email: ["An account with this email already exists."] } };

  const tempPassword = generateTempPassword();
  const user = await db.user.create({
    data: { ...parsed.data, passwordHash: await bcrypt.hash(tempPassword, 10) },
  });
  await logActivity({
    actorId: admin.id,
    action: "user.created",
    entityType: "User",
    entityId: user.id,
    details: { role: user.role },
  });

  revalidatePath("/admin/users");
  return { success: "Account created.", tempPassword, forName: user.name };
}

export async function resetPassword(_prev: UserActionState, formData: FormData): Promise<UserActionState> {
  const admin = await requireRole("ADMIN");
  const userId = String(formData.get("userId") ?? "");
  if (!userId || userId === admin.id) return { error: "Change your own password from your profile." };

  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, name: true } });
  if (!user) return { error: "User not found." };

  const tempPassword = generateTempPassword();
  await db.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(tempPassword, 10) } });
  await logActivity({ actorId: admin.id, action: "user.password_reset", entityType: "User", entityId: userId });

  return { success: "Password reset.", tempPassword, forName: user.name };
}

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
