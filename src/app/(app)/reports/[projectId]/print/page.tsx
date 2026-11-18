import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProjectAccess } from "@/lib/permissions";
import { startOfToday } from "@/lib/portfolio";
import { cn, formatDate, formatINR, humanize } from "@/lib/utils";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Project status report" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid">
      <h2 className="mb-2 border-b border-slate-200 pb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      {children}
    </section>
  );
}

const th = "py-1.5 pr-3 text-left text-xs font-medium text-slate-500";
const td = "py-1.5 pr-3 align-top";

export default async function PrintReportPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const user = await requireRole("ADMIN", "MANAGER");
  const access = await getProjectAccess(user, projectId);
  const id = access.project.id;
  const today = startOfToday();

  const [project, taskCounts, overdue, spend, byCategory, milestones, openTasks, updates] = await Promise.all([
    db.project.findUniqueOrThrow({
      where: { id },
      select: { code: true, name: true, status: true, startDate: true, endDate: true, budget: true, manager: { select: { name: true } } },
    }),
    db.task.groupBy({ by: ["status"], where: { projectId: id }, _count: { _all: true } }),
    db.task.count({ where: { projectId: id, status: { not: "DONE" }, dueDate: { lt: today } } }),
    db.expense.aggregate({ where: { projectId: id }, _sum: { amount: true } }),
    db.expense.groupBy({ by: ["category"], where: { projectId: id }, _sum: { amount: true } }),
    db.milestone.findMany({ where: { projectId: id }, orderBy: { dueDate: "asc" }, select: { id: true, title: true, dueDate: true, status: true, completedAt: true } }),
    db.task.findMany({
      where: { projectId: id, status: { not: "DONE" } },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }],
      select: { id: true, title: true, status: true, priority: true, dueDate: true, assignee: { select: { name: true } } },
    }),
    db.progressUpdate.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, summary: true, blockers: true, createdAt: true, author: { select: { name: true } } },
    }),
  ]);

  const total = taskCounts.reduce((n, t) => n + t._count._all, 0);
  const done = taskCounts.find((t) => t.status === "DONE")?._count._all ?? 0;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  const spent = spend._sum.amount ?? 0;
  const budgetUsed = project.budget > 0 ? Math.round((spent / project.budget) * 100) : null;
  const categories = byCategory
    .map((c) => ({ category: c.category, amount: c._sum.amount ?? 0 }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="mx-auto max-w-3xl bg-white text-slate-900 print:max-w-none">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/reports" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
          <ChevronLeft className="size-4" aria-hidden /> Reports
        </Link>
        <PrintButton />
      </div>

      <div className="space-y-6 rounded-lg border border-slate-200 p-6 sm:p-8 print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-slate-500">{project.code}</p>
            <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
            <p className="mt-1 text-sm text-slate-600">
              Managed by {project.manager.name} · {formatDate(project.startDate)} → {formatDate(project.endDate)}
            </p>
          </div>
          <div className="text-right">
            <StatusBadge value={project.status} />
            <p className="mt-2 text-xs text-slate-500">Generated {formatDate(new Date())}</p>
          </div>
        </header>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Progress", value: `${progress}%`, note: `${done} of ${total} tasks done` },
            {
              label: "Budget used",
              value: budgetUsed === null ? "—" : `${budgetUsed}%`,
              note: `${formatINR(spent)} of ${formatINR(project.budget)}`,
              tone: budgetUsed !== null && budgetUsed > 100 ? "text-red-600" : undefined,
            },
            { label: "Overdue tasks", value: String(overdue), note: "open and past due", tone: overdue > 0 ? "text-red-600" : undefined },
          ].map((s) => (
            <div key={s.label} className="rounded-md border border-slate-200 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">{s.label}</p>
              <p className={cn("mt-1 text-xl font-semibold tabular-nums", s.tone)}>{s.value}</p>
              <p className="text-xs text-slate-500">{s.note}</p>
            </div>
          ))}
        </div>

        <Section title="Milestones">
          {milestones.length === 0 ? (
            <p className="text-sm text-slate-500">No milestones.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className={th}>Milestone</th>
                    <th className={th}>Due</th>
                    <th className={th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {milestones.map((m) => {
                    const missed = m.status === "PENDING" && m.dueDate < today;
                    return (
                      <tr key={m.id} className="border-t border-slate-100">
                        <td className={td}>{m.title}</td>
                        <td className={cn(td, "whitespace-nowrap")}>{formatDate(m.dueDate)}</td>
                        <td className={cn(td, missed && "font-medium text-red-600")}>
                          {m.status === "COMPLETED" ? `Done ${formatDate(m.completedAt)}` : missed ? "Missed" : "Pending"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title={`Open tasks (${openTasks.length})`}>
          {openTasks.length === 0 ? (
            <p className="text-sm text-slate-500">No open tasks.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className={th}>Task</th>
                    <th className={th}>Assignee</th>
                    <th className={th}>Status</th>
                    <th className={th}>Priority</th>
                    <th className={th}>Due</th>
                  </tr>
                </thead>
                <tbody>
                  {openTasks.map((t) => {
                    const late = t.dueDate !== null && t.dueDate < today;
                    return (
                      <tr key={t.id} className="border-t border-slate-100">
                        <td className={td}>{t.title}</td>
                        <td className={td}>{t.assignee?.name ?? "—"}</td>
                        <td className={cn(td, "whitespace-nowrap")}>{humanize(t.status)}</td>
                        <td className={td}>{humanize(t.priority)}</td>
                        <td className={cn(td, "whitespace-nowrap", late && "font-medium text-red-600")}>
                          {formatDate(t.dueDate)}
                          {late ? " (overdue)" : ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="Latest updates">
          {updates.length === 0 ? (
            <p className="text-sm text-slate-500">No updates posted.</p>
          ) : (
            <ul className="space-y-3">
              {updates.map((u) => (
                <li key={u.id} className="break-inside-avoid text-sm">
                  <p className="text-xs text-slate-500">
                    {u.author.name} · {formatDate(u.createdAt)}
                  </p>
                  <p className="whitespace-pre-line">{u.summary}</p>
                  {u.blockers ? (
                    <p className="mt-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-amber-900">
                      <span className="font-semibold">Blocker:</span> {u.blockers}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Spend by category">
          {categories.length === 0 ? (
            <p className="text-sm text-slate-500">No expenses recorded.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {categories.map((c) => (
                  <tr key={c.category} className="border-t border-slate-100 first:border-t-0">
                    <td className={td}>{humanize(c.category)}</td>
                    <td className={cn(td, "text-right tabular-nums")}>{formatINR(c.amount)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-200 font-semibold">
                  <td className={td}>Total</td>
                  <td className={cn(td, "text-right tabular-nums")}>{formatINR(spent)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </Section>
      </div>
    </div>
  );
}
