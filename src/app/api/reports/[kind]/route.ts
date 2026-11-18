import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { visibleProjectsWhere } from "@/lib/permissions";
import { startOfToday } from "@/lib/portfolio";
import { humanize } from "@/lib/utils";
import { csvHeaders, serializeCsv, type CsvValue } from "../csv";

type Cell = CsvValue;

function toCsv(header: string[], rows: Cell[][]) {
  return serializeCsv([header, ...rows]);
}

/** YYYY-MM-DD in the server's local time. */
function day(d: Date | null | undefined) {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const KINDS = ["projects", "tasks", "expenses"] as const;
type Kind = (typeof KINDS)[number];

export async function GET(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (user.role !== "ADMIN" && user.role !== "MANAGER") return new Response("Forbidden", { status: 403 });

  const { kind } = await params;
  if (!KINDS.includes(kind as Kind)) return new Response("Not found", { status: 404 });

  const projectFilter = new URL(request.url).searchParams.get("project") || undefined;
  const visible = visibleProjectsWhere(user);
  const today = startOfToday();
  let csv: string;

  if (kind === "projects") {
    const projects = await db.project.findMany({
      where: visible,
      orderBy: { code: "asc" },
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
    const ids = projects.map((p) => p.id);
    const [spend, tasks, overdue, milestones] = await Promise.all([
      db.expense.groupBy({ by: ["projectId"], where: { projectId: { in: ids } }, _sum: { amount: true } }),
      db.task.groupBy({ by: ["projectId", "status"], where: { projectId: { in: ids } }, _count: { _all: true } }),
      db.task.groupBy({
        by: ["projectId"],
        where: { projectId: { in: ids }, status: { not: "DONE" }, dueDate: { lt: today } },
        _count: { _all: true },
      }),
      db.milestone.groupBy({ by: ["projectId", "status"], where: { projectId: { in: ids } }, _count: { _all: true } }),
    ]);
    const spentBy = new Map(spend.map((s) => [s.projectId, s._sum.amount ?? 0]));
    const overdueBy = new Map(overdue.map((o) => [o.projectId, o._count._all]));
    const count = (
      rows: { projectId: string; status: string; _count: { _all: number } }[],
      projectId: string,
      status?: string,
    ) => rows.filter((r) => r.projectId === projectId && (!status || r.status === status)).reduce((n, r) => n + r._count._all, 0);

    csv = toCsv(
      [
        "Code", "Name", "Status", "Manager", "Start", "End", "Budget (INR)", "Spent (INR)", "% budget used",
        "Tasks total", "Tasks done", "Overdue tasks", "Milestones done", "Milestones total",
      ],
      projects.map((p) => {
        const spent = spentBy.get(p.id) ?? 0;
        return [
          p.code, p.name, humanize(p.status), p.manager.name, day(p.startDate), day(p.endDate), p.budget, spent,
          p.budget > 0 ? Math.round((spent / p.budget) * 100) : "",
          count(tasks, p.id), count(tasks, p.id, "DONE"), overdueBy.get(p.id) ?? 0,
          count(milestones, p.id, "COMPLETED"), count(milestones, p.id),
        ];
      }),
    );
  } else if (kind === "tasks") {
    const tasks = await db.task.findMany({
      where: { project: visible, ...(projectFilter ? { projectId: projectFilter } : {}) },
      orderBy: [{ project: { code: "asc" } }, { dueDate: { sort: "asc", nulls: "last" } }],
      select: {
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        completedAt: true,
        project: { select: { code: true } },
        assignee: { select: { name: true } },
        milestone: { select: { title: true } },
      },
    });
    csv = toCsv(
      ["Project", "Title", "Status", "Priority", "Assignee", "Milestone", "Due date", "Completed at", "Overdue"],
      tasks.map((t) => [
        t.project.code, t.title, humanize(t.status), humanize(t.priority), t.assignee?.name ?? "", t.milestone?.title ?? "",
        day(t.dueDate), day(t.completedAt), t.status !== "DONE" && t.dueDate && t.dueDate < today ? "Yes" : "No",
      ]),
    );
  } else {
    const expenses = await db.expense.findMany({
      where: { project: visible, ...(projectFilter ? { projectId: projectFilter } : {}) },
      orderBy: [{ project: { code: "asc" } }, { spentOn: "desc" }],
      select: {
        title: true,
        amount: true,
        category: true,
        spentOn: true,
        project: { select: { code: true } },
        recordedBy: { select: { name: true } },
      },
    });
    csv = toCsv(
      ["Project", "Date", "Title", "Category", "Amount (INR)", "Recorded by"],
      expenses.map((e) => [e.project.code, day(e.spentOn), e.title, humanize(e.category), e.amount, e.recordedBy.name]),
    );
  }

  return new Response(csv, {
    headers: {
      ...csvHeaders(kind, new Date()),
      "Cache-Control": "private, no-store",
    },
  });
}
