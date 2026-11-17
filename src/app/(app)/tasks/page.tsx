import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Calendar, Folder } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { visibleProjectsWhere } from "@/lib/permissions";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { PageHeader, EmptyState } from "@/components/ui/page";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { StatusSelect } from "@/app/(app)/projects/[id]/tasks/task-dialog";
import { setMyTaskStatus } from "./actions";

export const metadata: Metadata = { title: "My tasks" };

export default async function MyTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ showCompleted?: string }>;
}) {
  const user = await requireUser();
  const search = await searchParams;
  const showCompleted = search.showCompleted === "true";

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  // Load all tasks assigned to user across visible projects
  const tasks = await db.task.findMany({
    where: {
      assigneeId: user.id,
      project: visibleProjectsWhere(user),
      ...(showCompleted
        ? {
            OR: [
              { status: { not: "DONE" } },
              { status: "DONE", completedAt: { gte: fourteenDaysAgo } },
            ],
          }
        : {
            status: { not: "DONE" },
          }),
    },
    include: {
      project: { select: { id: true, code: true, name: true } },
      milestone: { select: { id: true, title: true } },
    },
    orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
  });

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  // Grouping into sections
  type TaskWithRelations = (typeof tasks)[number];

  const overdue: TaskWithRelations[] = [];
  const dueToday: TaskWithRelations[] = [];
  const thisWeek: TaskWithRelations[] = [];
  const later: TaskWithRelations[] = [];
  const noDueDate: TaskWithRelations[] = [];
  const completed: TaskWithRelations[] = [];

  for (const t of tasks) {
    if (t.status === "DONE") {
      completed.push(t);
      continue;
    }

    if (!t.dueDate) {
      noDueDate.push(t);
    } else {
      const d = new Date(t.dueDate);
      if (d < todayStart) {
        overdue.push(t);
      } else if (d >= todayStart && d < tomorrowStart) {
        dueToday.push(t);
      } else if (d >= tomorrowStart && d <= weekEnd) {
        thisWeek.push(t);
      } else {
        later.push(t);
      }
    }
  }

  const sections = [
    { title: "Overdue", tasks: overdue, tone: "text-red-600" },
    { title: "Due today", tasks: dueToday, tone: "text-amber-600" },
    { title: "This week", tasks: thisWeek, tone: "text-slate-800" },
    { title: "Later", tasks: later, tone: "text-slate-700" },
    { title: "No due date", tasks: noDueDate, tone: "text-slate-500" },
    ...(showCompleted ? [{ title: "Completed (last 14 days)", tasks: completed, tone: "text-emerald-700" }] : []),
  ].filter((s) => s.tasks.length > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My tasks"
        description="All tasks assigned to you across projects."
        actions={
          <Link
            href={showCompleted ? "/tasks" : "/tasks?showCompleted=true"}
            className={buttonClasses("outline", "sm")}
          >
            {showCompleted ? "Hide completed" : "Show completed (last 14 days)"}
          </Link>
        }
      />

      {sections.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Nothing assigned to you"
          description={
            showCompleted
              ? "You have no active or recently completed tasks."
              : "You're all caught up! New tasks assigned to you will show up here."
          }
        />
      ) : (
        <div className="space-y-6">
          {sections.map((section) => (
            <Card key={section.title}>
              <CardHeader
                title={section.title}
                description={`${section.tasks.length} ${section.tasks.length === 1 ? "task" : "tasks"}`}
              />
              <CardBody className="p-0">
                <ul className="divide-y divide-slate-100">
                  {section.tasks.map((task) => {
                    const isDone = task.status === "DONE";
                    const isOverdue =
                      !isDone && task.dueDate !== null && new Date(task.dueDate) < todayStart;

                    return (
                      <li
                        key={task.id}
                        className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-slate-50/50 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`text-sm font-medium ${
                                isDone ? "text-slate-400 line-through" : "text-slate-900"
                              }`}
                            >
                              {task.title}
                            </span>
                            <StatusBadge value={task.priority} />
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            {/* Project link */}
                            <Link
                              href={`/projects/${task.project.id}/tasks`}
                              className="inline-flex items-center gap-1 font-medium text-brand-600 hover:underline"
                            >
                              <Folder className="size-3" />
                              <span className="font-mono text-[11px]">{task.project.code}</span> · {task.project.name}
                            </Link>

                            {/* Due date */}
                            {task.dueDate && (
                              <span
                                className={`inline-flex items-center gap-1 ${
                                  isOverdue ? "font-semibold text-red-600" : "text-slate-500"
                                }`}
                              >
                                <Calendar className="size-3" />
                                {formatDate(task.dueDate)}
                                {isOverdue ? " (Overdue)" : ""}
                              </span>
                            )}

                            {/* Milestone */}
                            {task.milestone && (
                              <span className="text-slate-400">
                                Milestone: {task.milestone.title}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status Select action */}
                        <div className="shrink-0 pt-2 sm:pt-0">
                          <StatusSelect
                            taskId={task.id}
                            currentStatus={task.status}
                            action={setMyTaskStatus}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
