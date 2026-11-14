import "server-only";
import { db } from "@/lib/db";
import type { NotificationType } from "@/generated/prisma/enums";

/**
 * Send an in-app notification to one or more users.
 * Anyone's feature may call this (e.g. when a task is assigned).
 * The notification inbox UI and automatic alerts are built in the notifications feature.
 */
export async function notify(input: {
  userIds: string[];
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  /** Usually the user who triggered it — they are not notified about their own action. */
  excludeUserId?: string;
}) {
  const recipients = [...new Set(input.userIds)].filter((id) => id && id !== input.excludeUserId);
  if (recipients.length === 0) return;

  await db.notification.createMany({
    data: recipients.map((userId) => ({
      userId,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link,
    })),
  });
}
