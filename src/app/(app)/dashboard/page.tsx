import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, FolderKanban, History } from "lucide-react";
import { HealthBadge, ScoreBar } from "@/components/health-badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { buttonClasses } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { canCreateProject, visibleProjectsWhere } from "@/lib/permissions";
import { getPortfolioHealth, startOfToday, type ProjectHealthRow } from "@/lib/portfolio";
import { db } from "@/lib/db";
import { cn, daysFromNow, formatDate, formatDateTime, formatINR } from "@/lib/utils";
import { ProgressBudgetChart, WorkloadChart } from "./charts";

export const metadata: Metadata = { title: "Dashboard" };

const RUNNING = ["ACTIVE", "ON_HOLD"] as const;
const LEVEL_ORDER = { OFF_TRACK: 0, AT_RISK: 1, ON_HOLD: 2, ON_TRACK: 3 } as Record<string, number>;

export default async function DashboardPage() {
  const user = await requireUser();
  const today = startOfToday();
  const inAWeek = new Date(today.getTime() + 7 * 86_400_000);
  const inTwoWeeks = new Date(today.getTime() + 14 * 86_400_000);
  const visible = visibleProjectsWhere(user);
  const showWorkload = user.role !== "MEMBER";

  const [rows, myOpen, myOverdue, myDueSoon, milestones, activity, workload] = await Promise.all([
    getPortfolioHealth(user),
    db.task.count({ where: { assigneeId: user.id, status: { not: "DONE" } } }),
    db.task.count({ where: { assigneeId: user.id, status: { not: "DONE" }, dueDate: { lt: today } } }),
    db.task.count({
      where: { assigneeId: user.id, status: { not: "DONE" }, dueDate: { gte: today, lt: inAWeek } },
    }),
    db.milestone.findMany({
      where: {
        status: "PENDING",
        dueDate: { gte: today, lt: inTwoWeeks },
        project: { AND: [visible, { status: { in: ["ACTIVE", "PLANNING"] } }] },
      },
      orderBy: { dueDate: "asc" },
      take: 6,
      select: { id: true, title: true, dueDate: true, project: { select: { id: true, code: true } } },
    }),
    db.activityLog.findMany({
      where: { project: visible },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        action: true,
        details: true,
        createdAt: true,
        actor: { select: { name: true } },
        project: { select: { id: true, code: true } },
      },
    }),
    showWorkload ? loadWorkload(user, today) : Promise.resolve([]),
  ]);

  if (rows.length === 0) {
    return (
      <>
        <PageHeader title={`${greeting()}, ${firstName(user.name)}`} />
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description={
            canCreateProject(user)
              ? "Create your first project to start tracking its health."
              : "You'll see projects here once a manager adds you to one."
          }
          action={
            canCreateProject(user) ? (
              <Link href="/projects/new" className={buttonClasses()}>
                New project
              </Link>
            ) : null
          }
        />
      </>
    );
  }

  const running = rows
    .filter((r) => (RUNNING as readonly string[]).includes(r.status))
    .sort(
      (a, b) =>
        (LEVEL_ORDER[a.health.level] ?? 9) - (LEVEL_ORDER[b.health.level] ?? 9) ||
        (a.health.score ?? 0) - (b.health.score ?? 0),
    );
  const needAttention = running.filter((r) => r.health.level === "AT_RISK" || r.health.level === "OFF_TRACK");
  const overdueTotal = running.reduce((s, r) => s + r.tasksOverdue, 0);
  const budgeted = running.filter((r) => r.budget > 0);
  const totalBudget = budgeted.reduce((s, r) => s + r.budget, 0);
  const totalSpent = budgeted.reduce((s, r) => s + r.spent, 0);
  const budgetPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : null;
  const others = rows.filter((r) => !(RUNNING as readonly string[]).includes(r.status));

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${firstName(user.name)}`}
        description={
          needAttention.length > 0
            ? `${needAttention.length} of ${running.length} running project${running.length === 1 ? " needs" : "s need"} attention.`
            : running.length > 0
              ? "All running projects are on track."
              : "No projects are running right now."
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Running projects" value={running.length} hint={`${rows.length} total`} />
        <Stat
          label="Need attention"
          value={needAttention.length}
          hint="At risk or off track"
          tone={needAttention.length > 0 ? "warn" : undefined}
        />
        <Stat
          label="Overdue tasks"
          value={overdueTotal}
          hint="Across running projects"
          tone={overdueTotal > 0 ? "bad" : undefined}
        />
        <Stat
          label="Budget used"
          value={budgetPct == null ? "—" : `${budgetPct}%`}
          hint={totalBudget > 0 ? `${lakh(totalSpent)} of ${lakh(totalBudget)}` : "No budgets set"}
          tone={budgetPct != null && budgetPct > 100 ? "bad" : undefined}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Project health */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Project health"
            description="Worst first. The score starts at 100 and drops for each warning sign."
            action={
              <Link href="/projects" className="whitespace-nowrap text-sm font-medium text-brand-700 hover:underline">
                All projects
              </Link>
            }
          />
          {running.length === 0 ? (
            <CardBody>
              <p className="text-sm text-slate-500">No active or on-hold projects.</p>
            </CardBody>
          ) : (
            <ul className="divide-y divide-slate-100">
              {running.map((r) => (
                <HealthRow key={r.id} row={r} />
              ))}
            </ul>
          )}
          {others.length > 0 ? (
            <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
              Not scored:{" "}
              {others.map((o, i) => (
                <span key={o.id}>
                  {i > 0 ? ", " : ""}
                  <Link href={`/projects/${o.id}`} className="hover:text-slate-900 hover:underline">
                    {o.code}
                  </Link>{" "}
                  ({o.status === "PLANNING" ? "planning" : o.status === "COMPLETED" ? "completed" : "cancelled"})
                </span>
              ))}
            </div>
          ) : null}
        </Card>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader
              title="My work"
              action={
                <Link href="/tasks" className="text-sm font-medium text-brand-700 hover:underline">
                  Open
                </Link>
              }
            />
            <CardBody className="grid grid-cols-3 gap-2 text-center">
              <MiniStat label="Open" value={myOpen} />
              <MiniStat label="Overdue" value={myOverdue} tone={myOverdue > 0 ? "bad" : undefined} />
              <MiniStat label="Due in 7 days" value={myDueSoon} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Upcoming milestones" description="Next 14 days" />
            {milestones.length === 0 ? (
              <CardBody>
                <p className="text-sm text-slate-500">Nothing due in the next two weeks.</p>
              </CardBody>
            ) : (
              <ul className="divide-y divide-slate-100">
                {milestones.map((m) => {
                  const d = daysFromNow(m.dueDate);
                  return (
                    <li key={m.id}>
                      <Link
                        href={`/projects/${m.project.id}`}
                        className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50"
                      >
                        <CalendarClock className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{m.title}</p>
                          <p className="text-xs text-slate-500">
                            {m.project.code} · {formatDate(m.dueDate)}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "whitespace-nowrap text-xs font-medium",
                            d <= 3 ? "text-amber-800" : "text-slate-500",
                          )}
                        >
                          {d === 0 ? "Today" : d === 1 ? "Tomorrow" : `In ${d} days`}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {/* Charts */}
      {running.length > 0 ? (
        <div className={cn("mt-6 grid gap-6", showWorkload && "lg:grid-cols-2")}>
          <Card>
            <CardHeader
              title="Work done vs budget used"
              description="If orange runs well ahead of blue, money is going faster than work."
            />
            <CardBody>
              <ProgressBudgetChart
                data={running.map((r) => ({
                  code: r.code,
                  name: r.name,
                  done: r.health.progressPct,
                  budgetUsed: r.health.budgetUsedPct,
                }))}
              />
            </CardBody>
          </Card>
          {showWorkload ? (
            <Card>
              <CardHeader title="Open tasks by person" description="Running projects only" />
              <CardBody>
                {workload.length === 0 ? (
                  <p className="text-sm text-slate-500">No open assigned tasks.</p>
                ) : (
                  <WorkloadChart data={workload} />
                )}
              </CardBody>
            </Card>
          ) : null}
        </div>
      ) : null}

      {/* Activity */}
      <Card className="mt-6">
        <CardHeader title="Recent activity" />
        {activity.length === 0 ? (
          <CardBody>
            <p className="text-sm text-slate-500">No activity yet.</p>
          </CardBody>
        ) : (
          <ul className="divide-y divide-slate-100">
            {activity.map((a) => (
              <li key={a.id} className="flex items-start gap-3 px-5 py-3 text-sm">
                <History className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
                <p className="flex-1">
                  <span className="font-medium">{a.actor.name}</span> {describe(a.action, a.details)}
                  {a.project ? (
                    <>
                      {" "}
                      in{" "}
                      <Link href={`/projects/${a.project.id}`} className="font-medium text-brand-700 hover:underline">
                        {a.project.code}
                      </Link>
                    </>
                  ) : null}
                </p>
                <time className="whitespace-nowrap text-xs text-slate-500" dateTime={a.createdAt.toISOString()}>
                  {formatDateTime(a.createdAt)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

// ───────────────────────────── Pieces ─────────────────────────────

function HealthRow({ row }: { row: ProjectHealthRow }) {
  const { health } = row;
  const daysLeft = daysFromNow(row.endDate);
  return (
    <li>
      <Link href={`/projects/${row.id}`} className="group block px-5 py-4 hover:bg-slate-50">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-xs text-slate-500">{row.code}</p>
            <p className="truncate font-medium group-hover:text-brand-700">{row.name}</p>
            <p className="text-xs text-slate-500">
              {row.managerName} · {row.tasksDone}/{row.tasksTotal} tasks ·{" "}
              {daysLeft >= 0 ? `${daysLeft} days left` : `${-daysLeft} days past end`}
            </p>
          </div>
          <HealthBadge level={health.level} score={health.score} />
        </div>
        {health.score != null ? (
          <div className="mt-3">
            <ScoreBar level={health.level} score={health.score} />
          </div>
        ) : null}
        {health.factors.length > 0 ? (
          <ul className="mt-3 space-y-1">
            {health.factors.slice(0, 3).map((f) => (
              <li key={f.label} className="flex items-baseline gap-2 text-xs text-slate-600">
                <span className="w-8 shrink-0 text-right font-semibold tabular-nums text-slate-700">−{f.impact}</span>
                <span>
                  <span className="font-medium text-slate-800">{f.label}:</span> {f.detail}
                </span>
              </li>
            ))}
            {health.factors.length > 3 ? (
              <li className="pl-10 text-xs text-slate-500">+{health.factors.length - 3} more</li>
            ) : null}
          </ul>
        ) : health.level === "ON_TRACK" ? (
          <p className="mt-2 text-xs text-slate-500">No warning signs.</p>
        ) : null}
      </Link>
    </li>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: "warn" | "bad";
}) {
  return (
    <Card className="px-4 py-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tabular-nums",
          tone === "bad" ? "text-red-700" : tone === "warn" ? "text-amber-800" : "text-slate-900",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 truncate text-xs text-slate-500">{hint}</p> : null}
    </Card>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone?: "bad" }) {
  return (
    <div>
      <p className={cn("text-xl font-semibold tabular-nums", tone === "bad" ? "text-red-700" : "text-slate-900")}>
        {value}
      </p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

// ───────────────────────────── Data helpers ─────────────────────────────

async function loadWorkload(user: Awaited<ReturnType<typeof requireUser>>, today: Date) {
  const base = {
    status: { not: "DONE" as const },
    assigneeId: { not: null },
    project: { AND: [visibleProjectsWhere(user), { status: { in: [...RUNNING] } }] },
  };
  const [open, overdue] = await Promise.all([
    db.task.groupBy({ by: ["assigneeId"], where: base, _count: { _all: true } }),
    db.task.groupBy({ by: ["assigneeId"], where: { ...base, dueDate: { lt: today } }, _count: { _all: true } }),
  ]);
  const ids = open.map((o) => o.assigneeId!).filter(Boolean);
  const users = await db.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
  const overdueMap = new Map(overdue.map((o) => [o.assigneeId, o._count._all]));

  return open
    .map((o) => {
      const late = overdueMap.get(o.assigneeId) ?? 0;
      return {
        name: users.find((u) => u.id === o.assigneeId)?.name ?? "Unknown",
        onTime: o._count._all - late,
        overdue: late,
      };
    })
    .sort((a, b) => b.onTime + b.overdue - (a.onTime + a.overdue))
    .slice(0, 8);
}

const VERBS: Record<string, string> = {
  "project.created": "created the project",
  "project.updated": "updated the project",
  "member.added": "added a member",
  "member.removed": "removed a member",
  "milestone.created": "added a milestone",
  "milestone.completed": "completed a milestone",
  "milestone.reopened": "reopened a milestone",
  "milestone.deleted": "deleted a milestone",
  "task.created": "created a task",
  "task.updated": "updated a task",
  "task.status_changed": "moved a task",
  "task.assigned": "assigned a task",
  "task.deleted": "deleted a task",
  "update.posted": "posted a progress update",
  "expense.added": "recorded an expense",
  "expense.updated": "edited an expense",
  "expense.deleted": "deleted an expense",
  "document.uploaded": "uploaded a document",
};

/** Human sentence for an activity row. Uses details.title when a feature provides it. */
function describe(action: string, details: unknown): string {
  const verb = VERBS[action] ?? action.replace(/[._]/g, " ");
  const title =
    details && typeof details === "object" && "title" in details && typeof details.title === "string"
      ? details.title
      : null;
  return title ? `${verb} “${title}”` : verb;
}

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date()),
  );
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

function firstName(name: string) {
  return name.split(" ")[0] ?? name;
}

/** ₹13.3L / ₹2.1Cr — short money for tight spaces. */
function lakh(amount: number) {
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(1)}Cr`;
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(1)}L`;
  return formatINR(amount);
}
