import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getProjectAccess } from "@/lib/permissions";
import { db } from "@/lib/db";
import { formatDate, humanize } from "@/lib/utils";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import type { TaskStatus } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Timeline" };

export default async function ProjectTimelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  await getProjectAccess(user, id);

  const project = await db.project.findUnique({
    where: { id },
    include: {
      milestones: {
        orderBy: { dueDate: "asc" },
      },
      tasks: {
        include: {
          assignee: { select: { name: true } },
          milestone: { select: { id: true, title: true } },
        },
        orderBy: { startDate: "asc" },
      },
    },
  });

  if (!project) notFound();

  // Determine timeline range: project.startDate to max(project.endDate, latest task dueDate)
  let rangeStart = new Date(project.startDate);
  let rangeEnd = new Date(project.endDate);

  for (const t of project.tasks) {
    if (t.dueDate && new Date(t.dueDate) > rangeEnd) {
      rangeEnd = new Date(t.dueDate);
    }
    if (t.startDate && new Date(t.startDate) < rangeStart) {
      rangeStart = new Date(t.startDate);
    }
  }

  // Normalize range start to beginning of the day
  rangeStart.setHours(0, 0, 0, 0);
  rangeEnd.setHours(23, 59, 59, 999);

  const totalMs = Math.max(1, rangeEnd.getTime() - rangeStart.getTime());
  const totalDays = Math.max(7, Math.ceil(totalMs / (1000 * 60 * 60 * 24)));

  // Generate weekly intervals for the header
  const weeks: { date: Date; leftPercent: number }[] = [];
  const curr = new Date(rangeStart);
  while (curr <= rangeEnd) {
    const leftPercent = ((curr.getTime() - rangeStart.getTime()) / totalMs) * 100;
    weeks.push({ date: new Date(curr), leftPercent });
    curr.setDate(curr.getDate() + 7);
  }

  // Today marker
  const now = new Date();
  const isTodayInRange = now >= rangeStart && now <= rangeEnd;
  const todayPercent = isTodayInRange
    ? ((now.getTime() - rangeStart.getTime()) / totalMs) * 100
    : null;

  // Separate scheduled vs unscheduled tasks
  const scheduledTasks = project.tasks.filter((t) => t.startDate || t.dueDate);
  const unscheduledTasks = project.tasks.filter((t) => !t.startDate && !t.dueDate);

  // Group scheduled tasks by milestone
  type MilestoneGroup = {
    milestoneId: string | null;
    title: string;
    dueDate: Date | null;
    status: string | null;
    tasks: typeof scheduledTasks;
  };

  const groups: MilestoneGroup[] = [];

  for (const m of project.milestones) {
    const tasksForM = scheduledTasks.filter((t) => t.milestoneId === m.id);
    groups.push({
      milestoneId: m.id,
      title: m.title,
      dueDate: m.dueDate,
      status: m.status,
      tasks: tasksForM,
    });
  }

  // Tasks without milestone go under "Other"
  const otherTasks = scheduledTasks.filter((t) => !t.milestoneId);
  if (otherTasks.length > 0) {
    groups.push({
      milestoneId: null,
      title: "Other",
      dueDate: null,
      status: null,
      tasks: otherTasks,
    });
  }

  const getBarColor = (status: TaskStatus, isOverdue: boolean) => {
    let base = "bg-slate-400";
    if (status === "DONE") base = "bg-emerald-500";
    else if (status === "IN_PROGRESS" || status === "IN_REVIEW") base = "bg-blue-500";

    if (isOverdue) {
      return `${base} ring-2 ring-red-500 ring-offset-1`;
    }
    return base;
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader
          title="Project schedule"
          description={`${formatDate(rangeStart)} → ${formatDate(rangeEnd)} (${totalDays} days)`}
          action={
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-xs bg-slate-400" /> To do
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-xs bg-blue-500" /> In progress / In review
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-xs bg-emerald-500" /> Done
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-xs ring-2 ring-red-500 bg-slate-300" /> Overdue
              </span>
            </div>
          }
        />

        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-[760px] pb-6">
              {/* Timeline Header Row */}
              <div className="relative flex border-b border-slate-200 bg-slate-50/80 text-xs text-slate-500">
                <div className="w-56 shrink-0 border-r border-slate-200 p-3 font-semibold text-slate-700">
                  Item / Task
                </div>

                <div className="relative flex-1 h-10">
                  {weeks.map((w, idx) => (
                    <div
                      key={idx}
                      style={{ left: `${w.leftPercent}%` }}
                      className="absolute top-0 bottom-0 border-l border-slate-200 pl-1.5 pt-2.5 whitespace-nowrap text-[11px]"
                    >
                      {formatDate(w.date)}
                    </div>
                  ))}

                  {/* Today marker header label */}
                  {todayPercent !== null && (
                    <div
                      style={{ left: `${todayPercent}%` }}
                      className="absolute top-1 z-20 -translate-x-1/2 rounded bg-red-600 px-1 py-0.5 text-[10px] font-bold text-on-color shadow-xs"
                    >
                      Today
                    </div>
                  )}
                </div>
              </div>

              {/* Groups & Task Rows */}
              <div className="relative divide-y divide-slate-100">
                {/* Vertical Today Line through entire chart aligned with chart column */}
                {todayPercent !== null && (
                  <div className="absolute left-56 right-0 top-0 bottom-0 pointer-events-none z-10 overflow-hidden">
                    <div
                      style={{ left: `${todayPercent}%` }}
                      className="absolute top-0 bottom-0 w-px bg-red-500"
                    />
                  </div>
                )}

                {groups.map((group, gIdx) => {
                  const milestoneLeft = group.dueDate
                    ? Math.max(
                        0,
                        Math.min(
                          100,
                          ((new Date(group.dueDate).getTime() - rangeStart.getTime()) / totalMs) *
                            100,
                        ),
                      )
                    : null;

                  return (
                    <div key={gIdx} className="bg-white">
                      {/* Milestone Row */}
                      <div className="flex items-center bg-slate-50/50 py-2 hover:bg-slate-50 transition-colors">
                        <div className="w-56 shrink-0 border-r border-slate-200 px-3 flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-900 truncate">
                            {group.title}
                          </span>
                          {group.status && (
                            <Badge tone={group.status === "COMPLETED" ? "green" : "gray"}>
                              {humanize(group.status)}
                            </Badge>
                          )}
                        </div>

                        <div className="relative flex-1 h-7">
                          {/* Milestone Diamond Marker */}
                          {milestoneLeft !== null && (
                            <div
                              style={{ left: `${milestoneLeft}%` }}
                              title={`Milestone: ${group.title} due ${formatDate(group.dueDate)}`}
                              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45 size-3 bg-brand-600 shadow-xs z-10 cursor-pointer"
                            />
                          )}
                        </div>
                      </div>

                      {/* Tasks under this Milestone */}
                      {group.tasks.map((task) => {
                        const tStart = task.startDate ? new Date(task.startDate) : (task.dueDate ? new Date(task.dueDate) : rangeStart);
                        const tEnd = task.dueDate ? new Date(task.dueDate) : tStart;

                        const leftPercent = Math.max(
                          0,
                          Math.min(
                            100,
                            ((tStart.getTime() - rangeStart.getTime()) / totalMs) * 100,
                          ),
                        );
                        const endPercent = Math.max(
                          leftPercent,
                          Math.min(
                            100,
                            ((tEnd.getTime() - rangeStart.getTime()) / totalMs) * 100,
                          ),
                        );
                        // Ensure bar has at least a visible minimum width (1.5%)
                        const widthPercent = Math.max(1.8, endPercent - leftPercent);

                        const isDone = task.status === "DONE";
                        const isOverdue =
                          !isDone && task.dueDate !== null && new Date(task.dueDate) < now;

                        const tooltip = `${task.title}\nAssignee: ${
                          task.assignee?.name ?? "Unassigned"
                        }\nStatus: ${humanize(task.status)}\nDates: ${formatDate(
                          task.startDate,
                        )} → ${formatDate(task.dueDate)}`;

                        return (
                          <div
                            key={task.id}
                            className="flex items-center py-2 hover:bg-slate-50/60 transition-colors"
                          >
                            <div className="w-56 shrink-0 border-r border-slate-200 px-3 pl-6">
                              <p className="text-xs text-slate-700 truncate" title={task.title}>
                                {task.title}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {task.assignee?.name ?? "Unassigned"}
                              </p>
                            </div>

                            <div className="relative flex-1 h-6">
                              {/* Task Bar */}
                              <div
                                style={{
                                  left: `${leftPercent}%`,
                                  width: `${widthPercent}%`,
                                }}
                                title={tooltip}
                                className={`absolute top-1/2 -translate-y-1/2 h-4 rounded-xs shadow-2xs transition-transform hover:scale-y-110 cursor-pointer ${getBarColor(
                                  task.status,
                                  isOverdue,
                                )}`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Unscheduled Tasks Section */}
      {unscheduledTasks.length > 0 && (
        <Card>
          <CardHeader
            title="Unscheduled tasks"
            description="Tasks without start or due dates."
          />
          <CardBody className="p-0">
            <ul className="divide-y divide-slate-100">
              {unscheduledTasks.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between px-5 py-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-slate-900">{t.title}</span>
                    <span className="text-slate-400">
                      {t.assignee?.name ? `(${t.assignee.name})` : "(Unassigned)"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge value={t.priority} />
                    <StatusBadge value={t.status} />
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
