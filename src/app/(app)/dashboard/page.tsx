import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUp,
  CalendarDays,
  CircleCheckBig,
  ClipboardList,
  Flag,
  FolderClosed,
  FolderKanban,
  FolderOpen,
  ListChecks,
  MessageSquareText,
  Activity as PulseIcon,
  UserPlus,
  Users,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { HealthBadge, ScoreBar } from "@/components/health-badge";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/page";
import { buttonClasses } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { canCreateProject, visibleProjectsWhere } from "@/lib/permissions";
import { getPortfolioHealth, startOfToday, type ProjectHealthRow } from "@/lib/portfolio";
import { db } from "@/lib/db";
import { cn, daysFromNow, formatINR } from "@/lib/utils";
import {
  ProgressBudgetChart,
  ProjectStatusDonut,
  WeeklyActivityChart,
  WorkloadChart,
  type DayActivity,
  type StatusSlice,
} from "./charts";

export const metadata: Metadata = { title: "Dashboard" };

const RUNNING = ["ACTIVE", "ON_HOLD"] as const;
const LEVEL_ORDER = { OFF_TRACK: 0, AT_RISK: 1, ON_HOLD: 2, ON_TRACK: 3 } as Record<string, number>;
const DAY = 86_400_000;

const STATUS_SLICES: { key: string; label: string; color: string }[] = [
  { key: "ACTIVE", label: "In progress", color: "#3dbd8c" },
  { key: "COMPLETED", label: "Completed", color: "#5aa7ee" },
  { key: "ON_HOLD", label: "On hold", color: "#a593f6" },
  { key: "PLANNING", label: "Planning", color: "#f4cf5d" },
  { key: "CANCELLED", label: "Cancelled", color: "#c4bdb6" },
];

export default async function DashboardPage() {
  const user = await requireUser();
  const today = startOfToday();
  const weekAgo = new Date(today.getTime() - 6 * DAY);
  const inTwoWeeks = new Date(today.getTime() + 14 * DAY);
  const visible = visibleProjectsWhere(user);
  const showWorkload = user.role !== "MEMBER";

  const [
    rows,
    doneTotal,
    doneThisWeek,
    teamSize,
    newMembers,
    recentProjects,
    milestones,
    myTasks,
    activity,
    weekTasks,
    weekUpdates,
    workload,
  ] = await Promise.all([
    getPortfolioHealth(user),
    db.task.count({ where: { status: "DONE", project: visible } }),
    db.task.count({ where: { status: "DONE", completedAt: { gte: weekAgo }, project: visible } }),
    db.user.count({
      where: {
        isActive: true,
        OR: [{ memberships: { some: { project: visible } } }, { managedProjects: { some: visible } }],
      },
    }),
    db.projectMember.groupBy({ by: ["userId"], where: { joinedAt: { gte: weekAgo }, project: visible } }),
    db.project.findMany({
      where: visible,
      orderBy: { updatedAt: "desc" },
      take: 4,
      select: { id: true, code: true, name: true, description: true, status: true },
    }),
    db.milestone.findMany({
      where: {
        status: "PENDING",
        dueDate: { gte: today, lt: inTwoWeeks },
        project: { AND: [visible, { status: { in: ["ACTIVE", "PLANNING"] } }] },
      },
      orderBy: { dueDate: "asc" },
      take: 6,
      select: { id: true, title: true, dueDate: true, project: { select: { id: true, code: true, name: true } } },
    }),
    db.task.findMany({
      where: { assigneeId: user.id, status: { not: "DONE" }, dueDate: { gte: today, lt: inTwoWeeks } },
      orderBy: { dueDate: "asc" },
      take: 6,
      select: {
        id: true,
        title: true,
        dueDate: true,
        priority: true,
        project: { select: { id: true, code: true, name: true } },
      },
    }),
    db.activityLog.findMany({
      where: { project: visible },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        action: true,
        details: true,
        createdAt: true,
        actor: { select: { name: true } },
        project: { select: { id: true, code: true } },
      },
    }),
    db.task.findMany({
      where: { status: "DONE", completedAt: { gte: weekAgo }, project: visible },
      select: { completedAt: true },
    }),
    db.progressUpdate.findMany({ where: { createdAt: { gte: weekAgo }, project: visible }, select: { createdAt: true } }),
    showWorkload ? loadWorkload(user, today) : Promise.resolve([]),
  ]);

  const greetingBlock = (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-base font-medium text-slate-700">
          <span aria-hidden>👋 </span>
          {greeting()},
        </p>
        <h1 className="mt-1 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">{firstName(user.name)}!</h1>
        <p className="mt-2 text-base text-slate-500">Here&apos;s what&apos;s happening with your projects today.</p>
      </div>
      <p className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 shadow-soft">
        <CalendarDays className="size-4 text-slate-500" aria-hidden />
        {new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(
          new Date(),
        )}
      </p>
    </div>
  );

  if (rows.length === 0) {
    return (
      <div className="space-y-8">
        {greetingBlock}
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
      </div>
    );
  }

  // ── Derived numbers ──
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
  const newThisWeek = rows.length > 0 ? await countNewProjects(user, weekAgo) : 0;

  const statusData: StatusSlice[] = STATUS_SLICES.map((s) => ({
    ...s,
    count: rows.filter((r) => r.status === s.key).length,
  }));

  const week = buildWeek(today, weekTasks.map((t) => t.completedAt!), weekUpdates.map((u) => u.createdAt));
  const rowById = new Map(rows.map((r) => [r.id, r]));
  const upcoming = buildUpcoming(milestones, myTasks);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      {/* ───────── Main column ───────── */}
      <div className="min-w-0 space-y-6">
        {greetingBlock}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={ClipboardList}
            tone="green"
            label="Total projects"
            value={rows.length}
            trend={newThisWeek > 0 ? { up: true, text: `${newThisWeek} this week` } : { text: `${running.length} running` }}
          />
          <StatCard
            icon={CircleCheckBig}
            tone="violet"
            label="Tasks completed"
            value={doneTotal}
            trend={doneThisWeek > 0 ? { up: true, text: `${doneThisWeek} this week` } : { text: "None this week" }}
          />
          <StatCard
            icon={Wallet}
            tone="amber"
            label="Budget used"
            value={budgetPct == null ? "—" : `${budgetPct}%`}
            valueClass={budgetPct != null && budgetPct > 100 ? "text-red-600" : undefined}
            trend={{ text: totalBudget > 0 ? `${lakh(totalSpent)} of ${lakh(totalBudget)}` : "No budgets set" }}
          />
          <StatCard
            icon={Users}
            tone="purple"
            label="Team members"
            value={teamSize}
            trend={newMembers.length > 0 ? { up: true, text: `${newMembers.length} new` } : { text: "0 new" }}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader title="Project progress" description="All projects by their current status." />
            <CardBody className="flex flex-col items-center gap-6 pb-6 sm:flex-row">
              <ProjectStatusDonut data={statusData} total={rows.length} />
              <ul className="w-full divide-y divide-stone-100 text-sm">
                {statusData
                  .filter((s) => s.count > 0 || s.key !== "CANCELLED")
                  .map((s) => (
                    <li key={s.key} className="flex items-center gap-3 py-2.5">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} aria-hidden />
                      <span className="flex-1 font-medium text-slate-800">{s.label}</span>
                      <span className="w-6 text-right tabular-nums text-slate-900">{s.count}</span>
                      <span className="w-10 text-right tabular-nums text-slate-500">
                        {Math.round((s.count / rows.length) * 100)}%
                      </span>
                    </li>
                  ))}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Weekly activity"
              description="Last 7 days"
              action={<PulseIcon className="size-5 text-slate-400" aria-hidden />}
            />
            <CardBody className="pb-5">
              <WeeklyActivityChart data={week} />
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader
            title="Recent projects"
            action={
              <Link href="/projects" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
                View all <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            }
          />
          <CardBody className="grid gap-4 pb-6 sm:grid-cols-2 2xl:grid-cols-4">
            {recentProjects.map((p, i) => {
              const r = rowById.get(p.id);
              const pct = r && r.tasksTotal > 0 ? Math.round((r.tasksDone / r.tasksTotal) * 100) : 0;
              return <ProjectTile key={p.id} project={p} pct={pct} tone={TILE_TONES[i % TILE_TONES.length]} />;
            })}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Project health"
            description={
              needAttention.length > 0
                ? `${needAttention.length} of ${running.length} running project${running.length === 1 ? " needs" : "s need"} attention · ${overdueTotal} overdue task${overdueTotal === 1 ? "" : "s"}`
                : running.length > 0
                  ? "All running projects are on track."
                  : "No projects are running right now."
            }
          />
          {running.length === 0 ? null : (
            <ul className="divide-y divide-stone-100 pb-2">
              {running.map((r) => (
                <HealthRow key={r.id} row={r} />
              ))}
            </ul>
          )}
        </Card>

        {running.length > 0 ? (
          <div className={cn("grid gap-6", showWorkload && "lg:grid-cols-2")}>
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
      </div>

      {/* ───────── Right rail ───────── */}
      <div className="space-y-6">
        <Card>
          <CardHeader
            title="Recent activity"
            action={<Zap className="size-5 text-slate-400" aria-hidden />}
          />
          {activity.length === 0 ? (
            <CardBody>
              <p className="text-sm text-slate-500">No activity yet.</p>
            </CardBody>
          ) : (
            <ul className="space-y-1 px-3 pb-4">
              {activity.map((a) => {
                const meta = activityMeta(a.action);
                const title = detailTitle(a.details);
                const body = (
                  <>
                    <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", TONES[meta.tone])}>
                      <meta.icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-900">{meta.title}</span>
                      <span className="block truncate text-xs text-slate-500">
                        {title ? `${title} · ` : ""}
                        {a.actor.name}
                        {a.project ? ` · ${a.project.code}` : ""}
                      </span>
                    </span>
                    <time className="shrink-0 text-xs text-slate-400" dateTime={a.createdAt.toISOString()}>
                      {timeAgo(a.createdAt)}
                    </time>
                  </>
                );
                return (
                  <li key={a.id}>
                    {a.project ? (
                      <Link href={`/projects/${a.project.id}`} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-stone-50">
                        {body}
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3 px-3 py-2.5">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Upcoming"
            description="Next 14 days"
            action={
              <Link href="/tasks" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
                My tasks <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            }
          />
          {upcoming.length === 0 ? (
            <CardBody>
              <p className="text-sm text-slate-500">Nothing due in the next two weeks.</p>
            </CardBody>
          ) : (
            <div className="space-y-5 px-6 pb-6 pt-1">
              {upcoming.map((group) => (
                <div key={group.key} className="flex gap-4">
                  <div className="w-12 shrink-0 pt-1 text-center">
                    <p className="text-2xl font-bold leading-none tabular-nums">{group.date.getDate()}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Intl.DateTimeFormat("en-IN", { month: "short" }).format(group.date)}
                    </p>
                  </div>
                  <ul className="min-w-0 flex-1 divide-y divide-stone-100 border-l border-stone-100 pl-4">
                    {group.items.map((item) => (
                      <li key={item.id} className="py-2 first:pt-0 last:pb-0">
                        <Link href={item.href} className="group block">
                          <p className="flex items-center gap-2 text-sm font-semibold text-slate-900 group-hover:text-brand-700">
                            <span className={cn("size-2.5 shrink-0 rounded-full", item.dot)} aria-hidden />
                            <span className="truncate">{item.title}</span>
                          </p>
                          <p className="mt-1 pl-4.5 text-xs text-slate-500">{relativeDay(group.date)}</p>
                          <p className="mt-1.5 flex items-start gap-1.5 pl-4.5 text-xs text-slate-600">
                            <item.icon className="mt-0.5 size-3.5 shrink-0 text-slate-400" aria-hidden />
                            <span>
                              {item.kind} · {item.project.code} {item.project.name}
                            </span>
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ───────────────────────────── Pieces ─────────────────────────────

const TONES = {
  green: "bg-emerald-100/80 text-emerald-700",
  violet: "bg-brand-100 text-brand-700",
  amber: "bg-amber-100 text-amber-700",
  purple: "bg-fuchsia-100/80 text-fuchsia-700",
  blue: "bg-sky-100 text-sky-700",
  orange: "bg-orange-100 text-orange-700",
} as const;
type ToneKey = keyof typeof TONES;

function StatCard({
  icon: Icon,
  tone,
  label,
  value,
  valueClass,
  trend,
}: {
  icon: LucideIcon;
  tone: ToneKey;
  label: string;
  value: number | string;
  valueClass?: string;
  trend: { up?: boolean; text: string };
}) {
  return (
    <Card className="p-5">
      <span className={cn("flex size-10 items-center justify-center rounded-full", TONES[tone])}>
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="mt-4 text-sm text-slate-600 sm:text-base">{label}</p>
      <p className={cn("mt-1 text-3xl font-bold tabular-nums tracking-tight sm:text-4xl", valueClass)}>{value}</p>
      <p className="mt-2 flex items-center gap-1.5 truncate text-sm text-slate-500">
        {trend.up ? (
          <ArrowUp className="size-4 shrink-0 text-emerald-600" aria-hidden />
        ) : (
          <ArrowRight className="size-4 shrink-0 text-slate-400" aria-hidden />
        )}
        <span className="truncate">{trend.text}</span>
      </p>
    </Card>
  );
}

const TILE_TONES = [
  { bg: "from-[#e3f5ec] to-[#cdebdc]", bar: "#3dbd8c" },
  { bg: "from-[#ece8fd] to-[#dcd4fb]", bar: "#8b7cf6" },
  { bg: "from-[#fdf1df] to-[#f9e1c2]", bar: "#eea53b" },
  { bg: "from-[#e2eefb] to-[#cbe0f7]", bar: "#4d94e0" },
];

function ProjectTile({
  project,
  pct,
  tone,
}: {
  project: { id: string; code: string; name: string; description: string | null; status: string };
  pct: number;
  tone: (typeof TILE_TONES)[number];
}) {
  return (
    <Link href={`/projects/${project.id}`} className="group block min-w-0">
      <div className={cn("relative h-28 overflow-hidden rounded-2xl bg-gradient-to-br p-3", tone.bg)}>
        {/* A small "screen" showing progress, in place of a thumbnail. */}
        <div className="absolute bottom-0 left-4 right-10 top-5 rounded-t-xl bg-white/90 p-3 shadow-sm transition-transform group-hover:-translate-y-0.5">
          <p className="font-mono text-[10px] text-slate-400">{project.code}</p>
          <p className="mt-1 text-lg font-bold tabular-nums leading-none text-slate-900">{pct}%</p>
          <div className="mt-2 h-1.5 rounded-full bg-stone-100">
            <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: tone.bar }} />
          </div>
          <p className="mt-1 text-[10px] text-slate-400">tasks done</p>
        </div>
        <div className="absolute bottom-3 right-3 top-9 w-12 rounded-lg bg-white/60" aria-hidden />
      </div>
      <p className="mt-3 truncate font-semibold text-slate-900 group-hover:text-brand-700">{project.name}</p>
      <p className="truncate text-sm text-slate-500">{project.description || project.code}</p>
      <StatusBadge value={project.status} className="mt-2" />
    </Link>
  );
}

function HealthRow({ row }: { row: ProjectHealthRow }) {
  const { health } = row;
  const daysLeft = daysFromNow(row.endDate);
  return (
    <li>
      <Link href={`/projects/${row.id}`} className="group block px-6 py-4 hover:bg-stone-50/70">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-xs text-slate-500">{row.code}</p>
            <p className="truncate font-semibold group-hover:text-brand-700">{row.name}</p>
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

// ───────────────────────────── Data helpers ─────────────────────────────

async function countNewProjects(user: Awaited<ReturnType<typeof requireUser>>, since: Date) {
  return db.project.count({ where: { AND: [visibleProjectsWhere(user), { createdAt: { gte: since } }] } });
}

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

/** One bucket per day for the last 7 days, oldest first. */
function buildWeek(today: Date, tasksDone: Date[], updates: Date[]): DayActivity[] {
  const days = Array.from({ length: 7 }, (_, i) => new Date(today.getTime() - (6 - i) * DAY));
  const indexOf = (d: Date) => {
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    return Math.round((start.getTime() - days[0].getTime()) / DAY);
  };
  const result = days.map((d) => ({
    day: new Intl.DateTimeFormat("en-IN", { weekday: "short" }).format(d),
    date: new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "short" }).format(d),
    tasksDone: 0,
    updates: 0,
  }));
  for (const d of tasksDone) {
    const i = indexOf(d);
    if (i >= 0 && i < 7) result[i].tasksDone++;
  }
  for (const d of updates) {
    const i = indexOf(d);
    if (i >= 0 && i < 7) result[i].updates++;
  }
  return result;
}

type ProjectRef = { id: string; code: string; name: string };
type UpcomingItem = {
  id: string;
  title: string;
  kind: string;
  href: string;
  dot: string;
  icon: LucideIcon;
  project: ProjectRef;
};

/** Milestones and my tasks for the next two weeks, grouped by day (first 3 days, 5 items max). */
function buildUpcoming(
  milestones: { id: string; title: string; dueDate: Date; project: ProjectRef }[],
  tasks: { id: string; title: string; dueDate: Date | null; project: ProjectRef }[],
) {
  const items: (UpcomingItem & { date: Date })[] = [
    ...milestones.map((m) => ({
      id: `m-${m.id}`,
      title: m.title,
      kind: "Milestone",
      href: `/projects/${m.project.id}`,
      dot: "bg-brand-500",
      icon: Flag,
      project: m.project,
      date: m.dueDate,
    })),
    ...tasks.map((t) => ({
      id: `t-${t.id}`,
      title: t.title,
      kind: "Your task",
      href: `/projects/${t.project.id}/tasks`,
      dot: "bg-emerald-500",
      icon: ListChecks,
      project: t.project,
      date: t.dueDate!,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  const groups: { key: string; date: Date; items: UpcomingItem[] }[] = [];
  for (const item of items.slice(0, 5)) {
    const key = item.date.toDateString();
    const group = groups.find((g) => g.key === key);
    if (group) group.items.push(item);
    else if (groups.length < 3) groups.push({ key, date: item.date, items: [item] });
  }
  return groups;
}

const ACTIVITY: Record<string, { title: string; icon: LucideIcon; tone: ToneKey }> = {
  "project.created": { title: "Project created", icon: FolderOpen, tone: "orange" },
  "project.updated": { title: "Project updated", icon: FolderOpen, tone: "amber" },
  "member.added": { title: "New team member", icon: UserPlus, tone: "purple" },
  "member.removed": { title: "Member removed", icon: Users, tone: "purple" },
  "milestone.created": { title: "Milestone added", icon: Flag, tone: "blue" },
  "milestone.completed": { title: "Milestone completed", icon: Flag, tone: "green" },
  "milestone.reopened": { title: "Milestone reopened", icon: Flag, tone: "amber" },
  "milestone.deleted": { title: "Milestone deleted", icon: Flag, tone: "blue" },
  "task.created": { title: "Task created", icon: ListChecks, tone: "green" },
  "task.updated": { title: "Task updated", icon: ListChecks, tone: "green" },
  "task.status_changed": { title: "Task moved", icon: ListChecks, tone: "green" },
  "task.assigned": { title: "Task assigned", icon: ListChecks, tone: "green" },
  "task.deleted": { title: "Task deleted", icon: ListChecks, tone: "green" },
  "update.posted": { title: "Progress update", icon: MessageSquareText, tone: "violet" },
  "update.deleted": { title: "Update deleted", icon: MessageSquareText, tone: "violet" },
  "expense.added": { title: "Expense recorded", icon: Wallet, tone: "amber" },
  "expense.updated": { title: "Expense edited", icon: Wallet, tone: "amber" },
  "expense.deleted": { title: "Expense deleted", icon: Wallet, tone: "amber" },
  "document.uploaded": { title: "File uploaded", icon: FolderClosed, tone: "green" },
  "document.deleted": { title: "File deleted", icon: FolderClosed, tone: "green" },
};

function activityMeta(action: string) {
  return (
    ACTIVITY[action] ?? {
      title: action.replace(/[._]/g, " ").replace(/^\w/, (c) => c.toUpperCase()),
      icon: PulseIcon,
      tone: "blue" as ToneKey,
    }
  );
}

function detailTitle(details: unknown): string | null {
  return details && typeof details === "object" && "title" in details && typeof details.title === "string"
    ? details.title
    : null;
}

function timeAgo(date: Date) {
  const mins = Math.max(0, Math.round((Date.now() - date.getTime()) / 60_000));
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(date);
}

function relativeDay(date: Date) {
  const d = daysFromNow(date);
  const weekday = new Intl.DateTimeFormat("en-IN", { weekday: "long" }).format(date);
  return d === 0 ? `Due today · ${weekday}` : d === 1 ? `Due tomorrow · ${weekday}` : `Due in ${d} days · ${weekday}`;
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
