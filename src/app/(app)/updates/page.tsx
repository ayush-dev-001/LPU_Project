import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label, Select } from "@/components/ui/form";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { visibleProjectsWhere } from "@/lib/permissions";
import { UpdateCard } from "./update-card";

export const metadata: Metadata = { title: "Updates" };
const PAGE_SIZE = 20;

const PAGE_SIZE = 20;

export default async function UpdatesPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; blockers?: string; page?: string }>;
}) {
  const search = await searchParams;
  const user = await requireUser();

  const projects = await db.project.findMany({
    where: visibleProjectsWhere(user),
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true },
  });

  const projectId = projects.some((p) => p.id === search.project) ? search.project : undefined;
  const onlyBlockers = search.blockers === "1";
  const page = Math.min(Math.max(Number.parseInt(search.page ?? "1", 10) || 1, 1), 50);

  const where: Prisma.ProgressUpdateWhereInput = {
    project: visibleProjectsWhere(user),
    ...(projectId ? { projectId } : {}),
    ...(onlyBlockers ? { AND: [{ blockers: { not: null } }, { NOT: { blockers: "" } }] } : {}),
  };

  const [total, updates] = await Promise.all([
    db.progressUpdate.count({ where }),
    db.progressUpdate.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: page * PAGE_SIZE,
      select: {
        id: true,
        projectId: true,
        summary: true,
        blockers: true,
        percentComplete: true,
        createdAt: true,
        authorId: true,
        author: { select: { name: true } },
        project: { select: { id: true, code: true, name: true, managerId: true } },
      },
    }),
  ]);

  const query = (extra: Record<string, string>) => {
    const params = new URLSearchParams();
    if (projectId) params.set("project", projectId);
    if (onlyBlockers) params.set("blockers", "1");
    for (const [k, v] of Object.entries(extra)) params.set(k, v);
    return `?${params.toString()}`;
  };
  const filtered = Boolean(projectId || onlyBlockers);

  return (
    <div>
      <PageHeader title="Updates" description="Latest progress updates from your projects." />

      <Card className="mb-6 p-4">
        <form method="get" className="flex flex-wrap items-end gap-4">
          <div className="w-full sm:w-72">
            <Label htmlFor="project">Project</Label>
            <Select id="project" name="project" defaultValue={projectId ?? ""}>
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} · {p.name}
                </option>
              ))}
            </Select>
          </div>
          <label className="flex h-10 items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="blockers"
              value="1"
              defaultChecked={onlyBlockers}
              className="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            Only with blockers
          </label>
          <div className="flex gap-2">
            <button type="submit" className={buttonClasses("primary", "md")}>
              Apply
            </button>
            {filtered ? (
              <Link href="/updates" className={buttonClasses("ghost", "md")}>
                Clear
              </Link>
            ) : null}
          </div>
        </form>
      </Card>

      {updates.length === 0 ? (
        <EmptyState
          icon={MessageSquareText}
          title={filtered ? "No matching updates" : "No updates yet"}
          description={filtered ? "Try another project or clear the filters." : "Updates posted on your projects will appear here."}
        />
      ) : (
        <div className="space-y-3">
          {updates.map((u) => (
            <UpdateCard
              key={u.id}
              update={u}
              canDelete={u.authorId === user.id || user.role === "ADMIN" || u.project.managerId === user.id}
            />
          ))}
          {total > updates.length ? (
            <div className="flex justify-center pt-2">
              <Link href={query({ page: String(page + 1) })} scroll={false} className={buttonClasses("outline", "sm")}>
                Load more ({total - updates.length} older)
              </Link>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
