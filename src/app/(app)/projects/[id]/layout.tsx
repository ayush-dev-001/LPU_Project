import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProjectAccess } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import { ProjectTabs } from "./project-tabs";

// Shared header + tab bar for every page under /projects/[id].
// Each tab is its own folder, owned by one feature — see CONTRIBUTING.md.
export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  await getProjectAccess(user, id); // 404s if the user can't see this project

  const project = await db.project.findUniqueOrThrow({
    where: { id },
    select: {
      code: true,
      name: true,
      status: true,
      startDate: true,
      endDate: true,
      manager: { select: { name: true } },
    },
  });

  return (
    <div>
      <Link href="/projects" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <ChevronLeft className="size-4" aria-hidden /> All projects
      </Link>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-slate-500">{project.code}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Managed by {project.manager.name} · {formatDate(project.startDate)} → {formatDate(project.endDate)}
          </p>
        </div>
        <StatusBadge value={project.status} />
      </div>
      <ProjectTabs projectId={id} />
      <div className="mt-6">{children}</div>
    </div>
  );
}
