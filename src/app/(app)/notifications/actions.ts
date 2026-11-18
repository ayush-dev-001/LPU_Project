"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ActionState } from "@/lib/action-state";
import { runAlerts } from "./alerts";

/** Only follow in-app paths, never an absolute or protocol-relative URL. */
function safeLink(link: string | null) {
  return link && link.startsWith("/") && !link.startsWith("//") ? link : "/notifications";
}

function refreshBadge() {
  // The unread badge lives in the (app) layout.
  revalidatePath("/", "layout");
}

export async function openNotification(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const notification = await db.notification.findFirst({
    where: { id, userId: user.id },
    select: { id: true, link: true, readAt: true },
  });
  if (!notification) redirect("/notifications");

  if (!notification.readAt) {
    await db.notification.updateMany({ where: { id: notification.id, userId: user.id }, data: { readAt: new Date() } });
    refreshBadge();
  }
  redirect(safeLink(notification.link));
}

export async function markRead(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  await db.notification.updateMany({ where: { id, userId: user.id, readAt: null }, data: { readAt: new Date() } });
  refreshBadge();
}

export async function markAllRead() {
  const user = await requireUser();
  await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  refreshBadge();
}

/** Used with useActionState; the previous state isn't needed. */
export async function runAlertsNow(): Promise<ActionState> {
  await requireRole("ADMIN");
  const created = await runAlerts();
  refreshBadge();
  return { success: `Created ${created} alert${created === 1 ? "" : "s"}.` };
}
