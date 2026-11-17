import type { Metadata } from "next";
import { ArrowDownToLine } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { Select } from "@/components/ui/form";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { visibleProjectsWhere } from "@/lib/permissions";
import { ProjectReportSelect } from "./report-project-select";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string; printProjectId?: string }>;
}) {
  const [user, query] = await Promise.all([requireRole("ADMIN", "MANAGER"), searchParams]);
  const projects = await db.project.findMany({
    where: visibleProjectsWhere(user),
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });
  const projectId = query.projectId && projects.some((project) => project.id === query.projectId)
    ? query.projectId
    : undefined;
  const csvHref = (kind: string) => `/api/reports/${kind}${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ""}`;

  return (
    <div>
      <PageHeader title="Reports" description="Export project, task and expense data, or print a project status report." />
      <form method="get" className="mb-5 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div className="min-w-52 flex-1">
          <label htmlFor="projectId" className="mb-1.5 block text-sm font-medium text-slate-700">Filter task and expense exports</label>
          <Select id="projectId" name="projectId" defaultValue={projectId ?? ""}>
            <option value="">All projects you can access</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.code} · {project.name}</option>)}
          </Select>
        </div>
        <Button type="submit" variant="outline" size="sm">Apply filter</Button>
      </form>

      <div className="grid gap-4 lg:grid-cols-3">
        <ReportCard
          title="Projects summary"
          description="Budgets, spend, task progress, overdue work and milestone completion for visible projects."
          href="/api/reports/projects"
        />
        <ReportCard
          title="Tasks"
          description="Status, priority, assignee, milestone, dates and overdue state."
          href={csvHref("tasks")}
        />
        <ReportCard
          title="Expenses"
          description="Project expenses with date, category, amount and recorded-by details."
          href={csvHref("expenses")}
        />
      </div>

      <Card className="mt-6">
        <CardHeader title="Project status report" description="Open a print-friendly A4 report and use your browser to save it as PDF." />
        <CardBody>
          <ProjectReportSelect projects={projects} />
        </CardBody>
      </Card>
    </div>
  );
}

function ReportCard({ title, description, href }: { title: string; description: string; href: string }) {
  return (
    <Card>
      <CardHeader title={title} />
      <CardBody className="flex h-full flex-col">
        <p className="mb-5 flex-1 text-sm leading-6 text-slate-600">{description}</p>
        <a href={href} className={buttonClasses("outline", "sm", "w-fit")}>
          <ArrowDownToLine className="size-4" aria-hidden /> Download CSV
        </a>
      </CardBody>
    </Card>
  );
}
