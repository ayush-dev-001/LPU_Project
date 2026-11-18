import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/page";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProjectAccess } from "@/lib/permissions";
import { UpdateCard } from "@/app/(app)/updates/update-card";
import { UpdateForm } from "./update-form";

const PAGE_SIZE = 20;

export default async function ProjectUpdatesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const { page: pageParam } = await searchParams;
  const user = await requireUser();
  const access = await getProjectAccess(user, id);

  // "Load more" keeps the earlier updates on screen: page 2 shows the first 40.
  const page = Math.min(Math.max(Number.parseInt(pageParam ?? "1", 10) || 1, 1), 50);
  const where = { projectId: access.project.id };
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
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      {access.isMember ? <UpdateForm projectId={access.project.id} /> : null}

      {updates.length === 0 ? (
        <EmptyState
          icon={MessageSquareText}
          title="No updates yet"
          description={access.isMember ? "Post the first update to let the team know how things are going." : undefined}
        />
      ) : (
        <div className="space-y-3">
          {updates.map((u) => (
            <UpdateCard key={u.id} update={u} canDelete={u.authorId === user.id || access.canManage} />
          ))}
          {total > updates.length ? (
            <div className="flex justify-center pt-2">
              <Link href={`?page=${page + 1}`} scroll={false} className={buttonClasses("outline", "sm")}>
                Load more ({total - updates.length} older)
              </Link>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
