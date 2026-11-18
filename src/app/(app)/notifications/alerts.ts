import "server-only";
import { db } from "@/lib/db";
import { startOfToday } from "@/lib/portfolio";
import { daysFromNow } from "@/lib/utils";
import type { NotificationType } from "@/generated/prisma/enums";

const DAY = 86_400_000;

type Pending = { userId: string; type: NotificationType; title: string; message: string; link: string };

function dueWords(due: Date) {
  const days = daysFromNow(due);
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

/**
 * Creates due-soon, overdue and milestone alerts for running and planned projects.
 * Safe to run repeatedly: a user never gets the same alert (type + link) twice within 24 hours.
 * Returns how many notifications were created.
 */
export async function runAlerts(): Promise<number> {
  const today = startOfToday();
  const projectFilter = { status: { in: ["ACTIVE", "PLANNING"] as ("ACTIVE" | "PLANNING")[] } };

  const [tasks, milestones] = await Promise.all([
    db.task.findMany({
      where: {
        status: { not: "DONE" },
        dueDate: { not: null, lt: new Date(today.getTime() + 3 * DAY) },
        project: projectFilter,
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        projectId: true,
        assignee: { select: { id: true, isActive: true } },
        project: { select: { name: true, managerId: true } },
      },
    }),
    db.milestone.findMany({
      where: {
        status: "PENDING",
        dueDate: { gte: today, lt: new Date(today.getTime() + 4 * DAY) },
        project: projectFilter,
      },
      select: { id: true, title: true, dueDate: true, projectId: true, project: { select: { name: true, managerId: true } } },
    }),
  ]);

  const pending: Pending[] = [];
  for (const t of tasks) {
    const due = t.dueDate!;
    const link = `/projects/${t.projectId}/tasks?task=${t.id}`;
    const assigneeId = t.assignee?.isActive ? t.assignee.id : null;

    if (due < today) {
      const late = -daysFromNow(due);
      const message = `“${t.title}” (${t.project.name}) is ${late} day${late === 1 ? "" : "s"} overdue.`;
      for (const userId of new Set([assigneeId, t.project.managerId])) {
        if (userId) pending.push({ userId, type: "TASK_OVERDUE", title: "Task overdue", message, link });
      }
    } else if (assigneeId) {
      pending.push({
        userId: assigneeId,
        type: "TASK_DUE_SOON",
        title: "Task due soon",
        message: `“${t.title}” (${t.project.name}) is due ${dueWords(due)}.`,
        link,
      });
    }
  }
  for (const m of milestones) {
    pending.push({
      userId: m.project.managerId,
      type: "MILESTONE_DUE_SOON",
      title: "Milestone due soon",
      message: `Milestone “${m.title}” (${m.project.name}) is due ${dueWords(m.dueDate)}.`,
      link: `/projects/${m.projectId}?milestone=${m.id}`,
    });
  }
  if (pending.length === 0) return 0;

  // Skip anything the same user already got in the last 24 hours, and inactive managers.
  const [recent, activeUsers] = await Promise.all([
    db.notification.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - DAY) },
        type: { in: ["TASK_DUE_SOON", "TASK_OVERDUE", "MILESTONE_DUE_SOON"] },
        userId: { in: [...new Set(pending.map((p) => p.userId))] },
      },
      select: { userId: true, type: true, link: true },
    }),
    db.user.findMany({
      where: { id: { in: [...new Set(pending.map((p) => p.userId))] }, isActive: true },
      select: { id: true },
    }),
  ]);
  const key = (n: { userId: string; type: string; link: string | null }) => `${n.userId}|${n.type}|${n.link}`;
  const seen = new Set(recent.map(key));
  const active = new Set(activeUsers.map((u) => u.id));

  const fresh = pending.filter((p) => {
    if (!active.has(p.userId) || seen.has(key(p))) return false;
    seen.add(key(p));
    return true;
  });
  if (fresh.length === 0) return 0;

  const { count } = await db.notification.createMany({ data: fresh });
  return count;
}
