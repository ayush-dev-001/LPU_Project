import type { Metadata } from "next";
import { Download, FileText } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Label, Select } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { visibleProjectsWhere } from "@/lib/permissions";
import { PrintReportPicker } from "./print-report-picker";

export const metadata: Metadata = { title: "Reports" };

function ProjectFilter({ id, projects }: { id: string; projects: { id: string; code: string; name: string }[] }) {
  return (
    <div className="min-w-0 flex-1">
      <Label htmlFor={id}>Project</Label>
      <Select id={id} name="project" defaultValue="">
        <option value="">All projects</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.code} · {p.name}
          </option>
        ))}
      </Select>
    </div>
  );
}

export default async function ReportsPage() {
  const user = await requireRole("ADMIN", "MANAGER");
  const projects = await db.project.findMany({
    where: visibleProjectsWhere(user),
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true },
  });

  return (
    <div>
      <PageHeader title="Reports" description="Download data as CSV for Excel, or print a project status report." />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col">
          <CardHeader
            title="Projects summary"
            description="One row per project: dates, budget and spend, task and milestone progress."
          />
          <CardBody className="mt-auto">
            <form method="get" action="/api/reports/projects">
              <button type="submit" className={buttonClasses("primary", "md", "w-full")}>
                <Download className="size-4" aria-hidden /> Download CSV
              </button>
            </form>
          </CardBody>
        </Card>

        <Card className="flex flex-col">
          <CardHeader title="Tasks" description="Every task with status, priority, assignee, due date and whether it is overdue." />
          <CardBody className="mt-auto">
            <form method="get" action="/api/reports/tasks" className="flex flex-wrap items-end gap-3">
              <ProjectFilter id="tasks-project" projects={projects} />
              <button type="submit" className={buttonClasses("primary", "md")}>
                <Download className="size-4" aria-hidden /> Download CSV
              </button>
            </form>
          </CardBody>
        </Card>

        <Card className="flex flex-col">
          <CardHeader title="Expenses" description="Every expense with date, category, amount and who recorded it." />
          <CardBody className="mt-auto">
            <form method="get" action="/api/reports/expenses" className="flex flex-wrap items-end gap-3">
              <ProjectFilter id="expenses-project" projects={projects} />
              <button type="submit" className={buttonClasses("primary", "md")}>
                <Download className="size-4" aria-hidden /> Download CSV
              </button>
            </form>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Project status report"
          description="A printable one-project summary. Use your browser's “Save as PDF” to get a PDF."
          action={<FileText className="size-5 text-slate-400" aria-hidden />}
        />
        <CardBody>
          <PrintReportPicker projects={projects} />
        </CardBody>
      </Card>
    </div>
  );
}
