import "server-only";

import type { NotificationType } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { notify } from "@/lib/notifications";
import { daysOverdue, daysUntil, getAlertDateWindow } from "./alert-dates";

type Candidate = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
};

export async function runAlerts(): Promise<number> {
  const { today, taskDueSoonEnd, milestoneDueSoonEnd } = getAlertDateWindow(new Date());
  const [dueSoonTasks, overdueTasks, dueSoonMilestones] = await Promise.all([
    db.task.findMany({
      where: {
        status: { not: "DONE" },
        dueDate: { gte: today, lt: taskDueSoonEnd },
        project: { status: { in: ["ACTIVE", "PLANNING"] } },
        assigneeId: { not: null },
      },
      include: { project: { select: { id: true, name: true } } },
    }),
    db.task.findMany({
      where: {
        status: { not: "DONE" },
        dueDate: { lt: today },
        project: { status: { in: ["ACTIVE", "PLANNING"] } },
      },
      include: {
        project: { select: { id: true, name: true, managerId: true } },
      },
    }),
    db.milestone.findMany({
      where: {
        status: "PENDING",
        dueDate: { gte: today, lt: milestoneDueSoonEnd },
        project: { status: { in: ["ACTIVE", "PLANNING"] } },
      },
      include: {
        project: {
          select: { id: true, name: true, managerId: true, manager: { select: { isActive: true } } },
        },
      },
    }),
  ]);

  const candidates: Candidate[] = [];
  for (const task of dueSoonTasks) {
    if (!task.assigneeId || !task.dueDate) continue;
    const remaining = daysUntil(task.dueDate, today);
    candidates.push({
      userId: task.assigneeId,
      type: "TASK_DUE_SOON",
      title: "Task due soon",
      message: remaining === 0
        ? `“${task.title}” (${task.project.name}) is due today.`
        : `“${task.title}” (${task.project.name}) is due in ${remaining} days.`,
      link: `/projects/${task.project.id}/tasks?task=${task.id}`,
    });
  }
  for (const task of overdueTasks) {
    if (!task.dueDate) continue;
    const overdue = daysOverdue(task.dueDate, today);
    const recipients = new Set([task.assigneeId, task.project.managerId].filter((id): id is string => Boolean(id)));
    for (const userId of recipients) {
      candidates.push({
        userId,
        type: "TASK_OVERDUE",
        title: "Task overdue",
        message: `“${task.title}” (${task.project.name}) is ${overdue} days overdue.`,
        link: `/projects/${task.project.id}/tasks?task=${task.id}`,
      });
    }
  }
  for (const milestone of dueSoonMilestones) {
    if (!milestone.project.manager.isActive) continue;
    const remaining = daysUntil(milestone.dueDate, today);
    candidates.push({
      userId: milestone.project.managerId,
      type: "MILESTONE_DUE_SOON",
      title: "Milestone due soon",
      message: `“${milestone.title}” (${milestone.project.name}) is due ${remaining === 0 ? "today" : `in ${remaining} days`}.`,
      link: `/projects/${milestone.project.id}?milestone=${milestone.id}`,
    });
  }

  if (candidates.length === 0) return 0;
  const cutoff = new Date(Date.now() - DAY_MS);
  const existing = await db.notification.findMany({
    where: {
      createdAt: { gte: cutoff },
      userId: { in: [...new Set(candidates.map((candidate) => candidate.userId))] },
      type: { in: [...new Set(candidates.map((candidate) => candidate.type))] },
      link: { in: [...new Set(candidates.map((candidate) => candidate.link))] },
    },
    select: { userId: true, type: true, link: true },
  });
  const existingKeys = new Set(existing.map((item) => `${item.userId}\u0000${item.type}\u0000${item.link}`));
  const grouped = new Map<string, { first: Candidate; userIds: string[] }>();
  for (const candidate of candidates) {
    const key = `${candidate.userId}\u0000${candidate.type}\u0000${candidate.link}`;
    if (existingKeys.has(key)) continue;
    const groupKey = `${candidate.type}\u0000${candidate.link}`;
    const group = grouped.get(groupKey);
    if (group) {
      if (!group.userIds.includes(candidate.userId)) group.userIds.push(candidate.userId);
    } else {
      grouped.set(groupKey, { first: candidate, userIds: [candidate.userId] });
    }
  }

  let created = 0;
  for (const { first, userIds } of grouped.values()) {
    await notify({
      userIds,
      type: first.type,
      title: first.title,
      message: first.message,
      link: first.link,
    });
    created += userIds.length;
  }
  return created;
}
