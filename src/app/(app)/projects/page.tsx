import type { Metadata } from "next";
import Link from "next/link";
import { FolderKanban, Plus, Search } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { canCreateProject, visibleProjectsWhere } from "@/lib/permissions";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { PageHeader, EmptyState } from "@/components/ui/page";
import { Card, CardBody } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import type { Prisma } from "@/generated/prisma/client";
import type { ProjectStatus } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Projects" };

const STATUS_ORDER: Record<ProjectStatus, number> = {
  ACTIVE: 1,
  PLANNING: 2,
  ON_HOLD: 3,
  COMPLETED: 4,
  CANCELLED: 5,
};

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const user = await requireUser();
  const search = await searchParams;

  const statusFilter = search.status?.toUpperCase() as ProjectStatus | undefined;
  const queryFilter = search.q?.trim();

  const whereClause: Prisma.ProjectWhereInput = {
    ...visibleProjectsWhere(user),
  };

  const andConditions: Prisma.ProjectWhereInput[] = [];

  if (
    statusFilter &&
    ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"].includes(statusFilter)
  ) {
    andConditions.push({ status: statusFilter });
  }

  if (queryFilter) {
    andConditions.push({
      OR: [
        { name: { contains: queryFilter, mode: "insensitive" } },
        { code: { contains: queryFilter, mode: "insensitive" } },
      ],
    });
  }

  if (andConditions.length > 0) {
    whereClause.AND = andConditions;
  }

  const projects = await db.project.findMany({
    where: whereClause,
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      startDate: true,
      endDate: true,
      manager: { select: { name: true } },
      _count: {
        select: {
          members: true,
        },
      },
    },
  });

  const projectIds = projects.map((p) => p.id);

  // Group tasks to get done / total counts per project efficiently
  const taskGroups = projectIds.length > 0
    ? await db.task.groupBy({
        by: ["projectId", "status"],
        where: { projectId: { in: projectIds } },
        _count: { _all: true },
      })
    : [];

  const taskStats = new Map<string, { total: number; done: number }>();
  for (const group of taskGroups) {
    const current = taskStats.get(group.projectId) ?? { total: 0, done: 0 };
    current.total += group._count._all;
    if (group.status === "DONE") {
      current.done += group._count._all;
    }
    taskStats.set(group.projectId, current);
  }

  // Sort: ACTIVE first, then PLANNING, ON_HOLD, COMPLETED, CANCELLED; within status, endDate ascending
  projects.sort((a, b) => {
    const orderA = STATUS_ORDER[a.status] ?? 99;
    const orderB = STATUS_ORDER[b.status] ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
  });

  const canCreate = canCreateProject(user);
  const now = new Date();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="All projects you manage or belong to."
        actions={
          canCreate ? (
            <Link href="/projects/new" className={buttonClasses("primary", "sm")}>
              <Plus className="size-4" aria-hidden /> New project
            </Link>
          ) : null
        }
      />

      {/* Filter bar */}
      <form method="GET" className="flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-64">
          <Input
            name="q"
            defaultValue={queryFilter ?? ""}
            placeholder="Search by name or code…"
            className="h-9"
          />
        </div>

        <div className="w-full sm:w-44">
          <Select name="status" defaultValue={statusFilter ?? ""} className="h-9">
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PLANNING">Planning</option>
            <option value="ON_HOLD">On hold</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
        </div>

        <button type="submit" className={buttonClasses("secondary", "sm")}>
          <Search className="size-3.5" aria-hidden /> Filter
        </button>

        {(queryFilter || statusFilter) && (
          <Link href="/projects" className="text-xs text-slate-500 hover:text-slate-800">
            Clear filters
          </Link>
        )}
      </form>

      {/* Project list or empty state */}
      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description={
            queryFilter || statusFilter
              ? "No projects match your current filters. Try resetting the filters."
              : "Projects you create or are added to will appear here."
          }
          action={
            canCreate && !queryFilter && !statusFilter ? (
              <Link href="/projects/new" className={buttonClasses("primary", "md")}>
                <Plus className="size-4" aria-hidden /> Create your first project
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const stats = taskStats.get(project.id) ?? { total: 0, done: 0 };
            const percent = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
            const isOverdue =
              new Date(project.endDate) < now &&
              project.status !== "COMPLETED" &&
              project.status !== "CANCELLED";

            return (
              <Card key={project.id} className="flex flex-col justify-between hover:border-slate-300 transition-colors">
                <CardBody className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs text-slate-500 uppercase">{project.code}</p>
                      <Link
                        href={`/projects/${project.id}`}
                        className="mt-1 block font-semibold text-slate-900 hover:text-brand-600 line-clamp-1"
                      >
                        {project.name}
                      </Link>
                    </div>
                    <StatusBadge value={project.status} />
                  </div>

                  <div className="text-xs text-slate-500 space-y-1">
                    <p>Manager: <span className="font-medium text-slate-700">{project.manager.name}</span></p>
                    <p>
                      Team:{" "}
                      <span className="font-medium text-slate-700">
                        {project._count.members} {project._count.members === 1 ? "member" : "members"}
                      </span>
                    </p>
                    <p>
                      Due:{" "}
                      <span className={isOverdue ? "font-semibold text-red-600" : "font-medium text-slate-700"}>
                        {formatDate(project.endDate)}
                        {isOverdue ? " (Overdue)" : ""}
                      </span>
                    </p>
                  </div>

                  {/* Task progress */}
                  <div className="space-y-1 pt-2 border-t border-slate-100">
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Task progress</span>
                      <span className="font-medium">
                        {stats.done} / {stats.total} done
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand-600 transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
