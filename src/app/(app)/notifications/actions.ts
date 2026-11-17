"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { runAlerts } from "./alerts";

export async function markRead(notificationId: string) {
  const user = await requireUser();
  await db.notification.updateMany({
    where: { id: notificationId, userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}

export async function markAllRead() {
  const user = await requireUser();
  await db.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}

export async function openNotification(notificationId: string) {
  const user = await requireUser();
  const notification = await db.notification.findFirst({
    where: { id: notificationId, userId: user.id },
    select: { id: true, link: true, readAt: true },
  });
  if (!notification) redirect("/notifications");
  if (!notification.readAt) {
    await db.notification.updateMany({
      where: { id: notification.id, userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    revalidatePath("/", "layout");
  }
  revalidatePath("/notifications");
  const link = notification.link;
  redirect(link?.startsWith("/") && !link.startsWith("//") ? link : "/notifications");
}

export async function runAlertsNow(_formData: FormData) {
  void _formData;
  await requireRole("ADMIN");
  const created = await runAlerts();
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
  redirect(`/notifications?alertsCreated=${created}`);
}
