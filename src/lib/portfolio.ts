import "server-only";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth";
import { computeHealth, type HealthResult } from "@/lib/health";
import { visibleProjectsWhere } from "@/lib/permissions";
import type { Prisma } from "@/generated/prisma/client";
import type { ProjectStatus } from "@/generated/prisma/enums";

export type ProjectHealthRow = {
  id: string;
  code: string;
  name: string;
  status: ProjectStatus;
  endDate: Date;
  managerName: string;
  budget: number;
  spent: number;
  tasksTotal: number;
  tasksDone: number;
  tasksOverdue: number;
  health: HealthResult;
};

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Health for every project the user can see (optionally narrowed by `where`).
 * Uses a fixed number of grouped queries, however many projects there are.
 */
export async function getPortfolioHealth(
  user: CurrentUser,
  where: Prisma.ProjectWhereInput = {},
): Promise<ProjectHealthRow[]> {
  const projects = await db.project.findMany({
    where: { AND: [visibleProjectsWhere(user), where] },
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      startDate: true,
      endDate: true,
      budget: true,
      manager: { select: { name: true } },
    },
  });
  if (projects.length === 0) return [];

  const ids = projects.map((p) => p.id);
  const today = startOfToday();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);

  const [taskCounts, overdueTasks, spend, overdueMilestones, blockers, lastUpdates] = await Promise.all([
    db.task.groupBy({ by: ["projectId", "status"], where: { projectId: { in: ids } }, _count: { _all: true } }),
    db.task.groupBy({
      by: ["projectId"],
      where: { projectId: { in: ids }, status: { not: "DONE" }, dueDate: { lt: today } },
      _count: { _all: true },
    }),
    db.expense.groupBy({ by: ["projectId"], where: { projectId: { in: ids } }, _sum: { amount: true } }),
    db.milestone.groupBy({
      by: ["projectId"],
      where: { projectId: { in: ids }, status: "PENDING", dueDate: { lt: today } },
      _count: { _all: true },
    }),
    db.progressUpdate.groupBy({
      by: ["projectId"],
      where: { projectId: { in: ids }, createdAt: { gte: weekAgo }, blockers: { not: null }, NOT: { blockers: "" } },
      _count: { _all: true },
    }),
    db.progressUpdate.groupBy({ by: ["projectId"], where: { projectId: { in: ids } }, _max: { createdAt: true } }),
  ]);

  const byProject = <T extends { projectId: string }>(rows: T[]) => new Map(rows.map((r) => [r.projectId, r]));
  const overdueMap = byProject(overdueTasks);
  const spendMap = byProject(spend);
  const milestoneMap = byProject(overdueMilestones);
  const blockerMap = byProject(blockers);
  const lastUpdateMap = byProject(lastUpdates);

  return projects.map((p) => {
    const counts = taskCounts.filter((t) => t.projectId === p.id);
    const tasksTotal = counts.reduce((s, c) => s + c._count._all, 0);
    const tasksDone = counts.find((c) => c.status === "DONE")?._count._all ?? 0;
    const tasksOverdue = overdueMap.get(p.id)?._count._all ?? 0;
    const spent = spendMap.get(p.id)?._sum.amount ?? 0;

    return {
      id: p.id,
      code: p.code,
      name: p.name,
      status: p.status,
      endDate: p.endDate,
      managerName: p.manager.name,
      budget: p.budget,
      spent,
      tasksTotal,
      tasksDone,
      tasksOverdue,
      health: computeHealth({
        status: p.status,
        startDate: p.startDate,
        endDate: p.endDate,
        budget: p.budget,
        spent,
        tasksTotal,
        tasksDone,
        tasksOverdue,
        milestonesOverdue: milestoneMap.get(p.id)?._count._all ?? 0,
        recentBlockers: blockerMap.get(p.id)?._count._all ?? 0,
        lastUpdateAt: lastUpdateMap.get(p.id)?._max.createdAt ?? null,
      }),
    };
  });
}
