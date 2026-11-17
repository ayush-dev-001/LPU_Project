import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { visibleProjectsWhere } from "@/lib/permissions";
import { UpdateCard } from "./update-card";

export const metadata: Metadata = { title: "Updates" };
const PAGE_SIZE = 20;

export default async function UpdatesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; projectId?: string; blockers?: string }>;
}) {
  const [user, query] = await Promise.all([requireUser(), searchParams]);
  const projects = await db.project.findMany({
    where: visibleProjectsWhere(user),
    select: { id: true, code: true, name: true, managerId: true },
    orderBy: { name: "asc" },
  });
  const selectedProjectId = query.projectId && projects.some((project) => project.id === query.projectId)
    ? query.projectId
    : undefined;
  const onlyBlockers = query.blockers === "on";
  const requestedPage = Number.parseInt(query.page ?? "1", 10);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const where = {
    project: { is: visibleProjectsWhere(user) },
    ...(query.projectId ? { projectId: selectedProjectId ?? "__not_visible__" } : {}),
    ...(onlyBlockers ? { blockers: { not: null } } : {}),
  };
  const [updates, total] = await Promise.all([
    db.progressUpdate.findMany({
      where,
      include: {
        author: { select: { id: true, name: true } },
        project: { select: { id: true, code: true, name: true, managerId: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.progressUpdate.count({ where }),
  ]);

  const nextParams = new URLSearchParams();
  if (selectedProjectId) nextParams.set("projectId", selectedProjectId);
  if (onlyBlockers) nextParams.set("blockers", "on");
  const nextPage = page + 1;
  nextParams.set("page", String(nextPage));

  return (
    <div>
      <PageHeader title="Updates" description="Latest progress updates from projects you can access." />
      <form method="get" className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div className="min-w-48 flex-1">
          <label htmlFor="projectId" className="mb-1.5 block text-sm font-medium text-slate-700">Project</label>
          <Select id="projectId" name="projectId" defaultValue={selectedProjectId ?? ""}>
            <option value="">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.code} · {project.name}</option>
            ))}
          </Select>
        </div>
        <label className="flex min-h-10 items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="blockers" value="on" defaultChecked={onlyBlockers} className="size-4 rounded border-slate-300 text-brand-600" />
          Only with blockers
        </label>
        <Button type="submit" size="sm">Apply filters</Button>
      </form>
      {updates.length === 0 ? (
        <EmptyState icon={MessageSquareText} title="No updates yet" description="Try another project or filter." />
      ) : (
        <div className="space-y-4">
          {updates.map((update) => (
            <UpdateCard
              key={update.id}
              update={update}
              projectId={update.project.id}
              project={update.project}
              canDelete={user.role === "ADMIN" || update.project.managerId === user.id || update.authorId === user.id}
            />
          ))}
          <div className="flex flex-wrap justify-between gap-3 pt-2 text-sm">
            {page > 1 ? (
              <Link
                href={`/updates?${new URLSearchParams({ ...(selectedProjectId ? { projectId: selectedProjectId } : {}), ...(onlyBlockers ? { blockers: "on" } : {}), page: String(page - 1) }).toString()}`}
                className="text-brand-700 hover:underline"
              >
                Previous page
              </Link>
            ) : <span />}
            {page * PAGE_SIZE < total ? (
              <Link href={`/updates?${nextParams.toString()}`} className="text-brand-700 hover:underline">
                Load more
              </Link>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
