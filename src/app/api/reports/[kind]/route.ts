import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { visibleProjectsWhere } from "@/lib/permissions";

type CsvValue = string | number | boolean | null | undefined;

function csvCell(value: CsvValue) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function csvResponse(kind: string, rows: CsvValue[][]) {
  const content = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
  const date = new Date().toISOString().slice(0, 10);
  return new Response(content, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="projectpulse-${kind}-${date}.csv"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function isoDate(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : "";
}

export async function GET(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (user.role !== "ADMIN" && user.role !== "MANAGER") {
    return new Response("Forbidden", { status: 403 });
  }
  const { kind } = await params;
  if (!["projects", "tasks", "expenses"].includes(kind)) {
    return new Response("Not found", { status: 404 });
  }
  const visible = visibleProjectsWhere(user);
  const projectId = new URL(request.url).searchParams.get("projectId") ?? undefined;

  if (kind === "projects") {
    const projects = await db.project.findMany({
      where: visible,
      include: { manager: { select: { name: true } } },
      orderBy: { code: "asc" },
    });
    const ids = projects.map((project) => project.id);
    if (ids.length === 0) {
      return csvResponse(kind, [[
        "Project code", "Project name", "Status", "Manager", "Start date", "End date", "Budget",
        "Spent", "Budget used %", "Tasks total", "Tasks done", "Overdue tasks", "Milestones done", "Milestones total",
      ]]);
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [taskCounts, overdueCounts, expenses, milestoneCounts] = await Promise.all([
      db.task.groupBy({ by: ["projectId", "status"], where: { projectId: { in: ids } }, _count: { _all: true } }),
      db.task.groupBy({
        by: ["projectId"],
        where: { projectId: { in: ids }, status: { not: "DONE" }, dueDate: { lt: today } },
        _count: { _all: true },
      }),
      db.expense.groupBy({ by: ["projectId"], where: { projectId: { in: ids } }, _sum: { amount: true } }),
      db.milestone.groupBy({ by: ["projectId", "status"], where: { projectId: { in: ids } }, _count: { _all: true } }),
    ]);
    const tasksByProject = new Map<string, { total: number; done: number }>();
    for (const row of taskCounts) {
      const current = tasksByProject.get(row.projectId) ?? { total: 0, done: 0 };
      current.total += row._count._all;
      if (row.status === "DONE") current.done += row._count._all;
      tasksByProject.set(row.projectId, current);
    }
    const overdueByProject = new Map(overdueCounts.map((row) => [row.projectId, row._count._all]));
    const spentByProject = new Map(expenses.map((row) => [row.projectId, row._sum.amount ?? 0]));
    const milestonesByProject = new Map<string, { total: number; done: number }>();
    for (const row of milestoneCounts) {
      const current = milestonesByProject.get(row.projectId) ?? { total: 0, done: 0 };
      current.total += row._count._all;
      if (row.status === "COMPLETED") current.done += row._count._all;
      milestonesByProject.set(row.projectId, current);
    }

    return csvResponse(kind, [
      [
        "Project code", "Project name", "Status", "Manager", "Start date", "End date", "Budget",
        "Spent", "Budget used %", "Tasks total", "Tasks done", "Overdue tasks", "Milestones done", "Milestones total",
      ],
      ...projects.map((project) => {
        const tasks = tasksByProject.get(project.id) ?? { total: 0, done: 0 };
        const milestones = milestonesByProject.get(project.id) ?? { total: 0, done: 0 };
        const spent = spentByProject.get(project.id) ?? 0;
        return [
          project.code,
          project.name,
          project.status,
          project.manager.name,
          isoDate(project.startDate),
          isoDate(project.endDate),
          project.budget,
          spent,
          project.budget > 0 ? `${((spent / project.budget) * 100).toFixed(1)}%` : "",
          tasks.total,
          tasks.done,
          overdueByProject.get(project.id) ?? 0,
          milestones.done,
          milestones.total,
        ];
      }),
    ]);
  }

  const where = {
    project: { is: visible },
    ...(projectId ? { projectId } : {}),
  };
  if (kind === "tasks") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tasks = await db.task.findMany({
      where,
      include: {
        project: { select: { code: true } },
        assignee: { select: { name: true } },
        milestone: { select: { title: true } },
      },
      orderBy: [{ project: { code: "asc" } }, { title: "asc" }],
    });
    return csvResponse(kind, [
      ["Project code", "Title", "Status", "Priority", "Assignee", "Milestone", "Due date", "Completed at", "Overdue"],
      ...tasks.map((task) => [
        task.project.code,
        task.title,
        task.status,
        task.priority,
        task.assignee?.name ?? "",
        task.milestone?.title ?? "",
        isoDate(task.dueDate),
        isoDate(task.completedAt),
        task.status !== "DONE" && task.dueDate !== null && task.dueDate < today ? "yes" : "no",
      ]),
    ]);
  }

  const expenses = await db.expense.findMany({
    where,
    include: {
      project: { select: { code: true } },
      recordedBy: { select: { name: true } },
    },
    orderBy: [{ project: { code: "asc" } }, { spentOn: "desc" }],
  });
  return csvResponse(kind, [
    ["Project code", "Date", "Title", "Category", "Amount (INR)", "Recorded by"],
    ...expenses.map((expense) => [
      expense.project.code,
      isoDate(expense.spentOn),
      expense.title,
      expense.category,
      expense.amount,
      expense.recordedBy.name,
    ]),
  ]);
}
