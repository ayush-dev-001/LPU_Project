import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import { EmptyState } from "@/components/ui/page";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProjectAccess } from "@/lib/permissions";
import { UpdateCard } from "../../../updates/update-card";
import { UpdateForm } from "./update-form";

const PAGE_SIZE = 20;

export default async function ProjectUpdatesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ id }, query, user] = await Promise.all([params, searchParams, requireUser()]);
  const access = await getProjectAccess(user, id);
  const requestedPage = Number.parseInt(query.page ?? "1", 10);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const where = { projectId: access.project.id };
  const [updates, total] = await Promise.all([
    db.progressUpdate.findMany({
      where,
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.progressUpdate.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      {access.isMember ? <UpdateForm projectId={access.project.id} /> : null}
      {updates.length === 0 && page === 1 ? (
        <EmptyState icon={MessageSquareText} title="No updates yet" description="Progress updates will appear here." />
      ) : (
        <div className="space-y-4">
          {updates.map((update) => (
            <UpdateCard
              key={update.id}
              update={update}
              projectId={access.project.id}
              canDelete={access.canManage || update.authorId === user.id}
            />
          ))}
          {page * PAGE_SIZE < total ? (
            <Link
              href={`/projects/${access.project.id}/updates?page=${page + 1}`}
              className="inline-flex min-h-10 items-center text-sm font-medium text-brand-700 hover:text-brand-900"
            >
              Load more
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}
