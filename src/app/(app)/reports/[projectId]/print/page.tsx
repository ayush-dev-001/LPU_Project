import type { Metadata } from "next";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProjectAccess } from "@/lib/permissions";
import { formatDate, formatDateTime, formatINR, humanize } from "@/lib/utils";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Project status report" };

export default async function PrintProjectReport({ params }: { params: Promise<{ projectId: string }> }) {
  const [{ projectId }, user] = await Promise.all([params, requireUser()]);
  const access = await getProjectAccess(user, projectId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [project, tasks, milestones, updates, spent, spendByCategory, taskCounts, overdueCount] = await Promise.all([
    db.project.findUniqueOrThrow({
      where: { id: access.project.id },
      include: { manager: { select: { name: true } } },
    }),
    db.task.findMany({
      where: { projectId: access.project.id, status: { not: "DONE" } },
      include: { assignee: { select: { name: true } }, milestone: { select: { title: true } } },
      orderBy: [{ dueDate: "asc" }, { title: "asc" }],
    }),
    db.milestone.findMany({ where: { projectId: access.project.id }, orderBy: { dueDate: "asc" } }),
    db.progressUpdate.findMany({
      where: { projectId: access.project.id },
      include: { author: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.expense.aggregate({ where: { projectId: access.project.id }, _sum: { amount: true } }),
    db.expense.groupBy({
      by: ["category"],
      where: { projectId: access.project.id },
      _sum: { amount: true },
      orderBy: { category: "asc" },
    }),
    db.task.groupBy({
      by: ["status"],
      where: { projectId: access.project.id },
      _count: { _all: true },
    }),
    db.task.count({
      where: { projectId: access.project.id, status: { not: "DONE" }, dueDate: { lt: today } },
    }),
  ]);

  const taskTotal = taskCounts.reduce((sum, row) => sum + row._count._all, 0);
  const taskDone = taskCounts.find((row) => row.status === "DONE")?._count._all ?? 0;
  const progress = taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : 0;
  const totalSpent = spent._sum.amount ?? 0;
  const budgetUsed = project.budget > 0 ? `${((totalSpent / project.budget) * 100).toFixed(1)}%` : "No budget";

  return (
    <main className="mx-auto max-w-4xl space-y-5 print:max-w-none print:space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-slate-500">{project.code}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{project.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <StatusBadge value={project.status} />
            <span>Manager: {project.manager.name}</span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {formatDate(project.startDate)} – {formatDate(project.endDate)} · Generated {formatDateTime(new Date())}
          </p>
        </div>
        <PrintButton />
      </div>

      <section className="grid gap-3 sm:grid-cols-4 print:grid-cols-4">
        <ReportMetric label="Task progress" value={`${progress}%`} />
        <ReportMetric label="Tasks complete" value={`${taskDone} / ${taskTotal}`} />
        <ReportMetric label="Budget used" value={budgetUsed} detail={formatINR(totalSpent)} />
        <ReportMetric label="Overdue tasks" value={String(overdueCount)} />
      </section>

      <Card className="print:break-inside-avoid">
        <CardHeader title="Milestones" />
        <CardBody className="p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr><th className="px-4 py-2">Milestone</th><th className="px-4 py-2">Due date</th><th className="px-4 py-2">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {milestones.map((milestone) => (
                <tr key={milestone.id}>
                  <td className="px-4 py-2 font-medium">{milestone.title}</td>
                  <td className="px-4 py-2">{formatDate(milestone.dueDate)}</td>
                  <td className="px-4 py-2"><StatusBadge value={milestone.status} /></td>
                </tr>
              ))}
              {milestones.length === 0 ? <tr><td className="px-4 py-3 text-slate-500" colSpan={3}>No milestones.</td></tr> : null}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Card className="print:break-inside-avoid">
        <CardHeader title="Open tasks" description={`${tasks.length} not completed`} />
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr><th className="px-4 py-2">Task</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Assignee</th><th className="px-4 py-2">Due</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map((task) => (
                  <tr key={task.id}>
                    <td className="px-4 py-2">
                      <span className="font-medium">{task.title}</span>
                      {task.milestone ? <span className="block text-xs text-slate-500">{task.milestone.title}</span> : null}
                    </td>
                    <td className="px-4 py-2"><StatusBadge value={task.status} /></td>
                    <td className="px-4 py-2">{task.assignee?.name ?? "Unassigned"}</td>
                    <td className="whitespace-nowrap px-4 py-2">{formatDate(task.dueDate)}</td>
                  </tr>
                ))}
                {tasks.length === 0 ? <tr><td className="px-4 py-3 text-slate-500" colSpan={4}>All tasks are complete.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Card className="print:break-inside-avoid">
        <CardHeader title="Recent progress updates" description="Latest 5 updates" />
        <CardBody className="space-y-4">
          {updates.length === 0 ? <p className="text-sm text-slate-500">No progress updates.</p> : updates.map((update) => (
            <article key={update.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
              <p className="text-xs text-slate-500">{update.author.name} · {formatDateTime(update.createdAt)}</p>
              <p className="mt-1 whitespace-pre-line text-sm text-slate-800">{update.summary}</p>
              {update.blockers ? (
                <div className="mt-2 rounded border border-amber-200 bg-amber-50 p-2 text-sm text-amber-950 print:bg-white">
                  <Badge tone="amber">Blocker</Badge>
                  <p className="mt-1 whitespace-pre-line">{update.blockers}</p>
                </div>
              ) : null}
              {update.percentComplete !== null ? <p className="mt-1 text-xs text-slate-500">Reported progress: {update.percentComplete}%</p> : null}
            </article>
          ))}
        </CardBody>
      </Card>

      <Card className="print:break-inside-avoid">
        <CardHeader title="Spend by category" description={`Total spend: ${formatINR(totalSpent)}`} />
        <CardBody className="p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr><th className="px-4 py-2">Category</th><th className="px-4 py-2 text-right">Amount</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {spendByCategory.map((row) => (
                <tr key={row.category}><td className="px-4 py-2">{humanize(row.category)}</td><td className="px-4 py-2 text-right tabular-nums">{formatINR(row._sum.amount ?? 0)}</td></tr>
              ))}
              {spendByCategory.length === 0 ? <tr><td className="px-4 py-3 text-slate-500" colSpan={2}>No recorded expenses.</td></tr> : null}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </main>
  );
}

function ReportMetric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <Card className="print:break-inside-avoid">
      <CardBody className="p-4">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{value}</p>
        {detail ? <p className="text-xs text-slate-500">{detail}</p> : null}
      </CardBody>
    </Card>
  );
}
