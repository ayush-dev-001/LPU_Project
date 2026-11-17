import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { initials } from "@/lib/utils";
import { DeleteUpdateButton } from "../projects/[id]/updates/update-form";

type UpdateCardData = {
  id: string;
  summary: string;
  blockers: string | null;
  percentComplete: number | null;
  createdAt: Date;
  author: { id: string; name: string };
};

function relativeTime(date: Date) {
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

export function UpdateCard({
  update,
  projectId,
  canDelete,
  project,
}: {
  update: UpdateCardData;
  projectId: string;
  canDelete: boolean;
  project?: { code: string; name: string };
}) {
  return (
    <Card>
      <CardBody>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700" aria-hidden>
              {initials(update.author.name)}
            </span>
            <div className="min-w-0">
              <p className="font-medium text-slate-900">{update.author.name}</p>
              <p className="text-xs text-slate-500">{relativeTime(update.createdAt)}</p>
            </div>
          </div>
          {project ? (
            <Link href={`/projects/${projectId}/updates`} className="text-right text-xs text-brand-700 hover:underline">
              <span className="font-mono">{project.code}</span>
              <span className="block text-slate-600">{project.name}</span>
            </Link>
          ) : null}
        </div>
        <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">{update.summary}</p>
        {update.blockers ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <p className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="size-4" aria-hidden /> Blocker
            </p>
            <p className="mt-1 whitespace-pre-line">{update.blockers}</p>
          </div>
        ) : null}
        {update.percentComplete !== null ? (
          <div className="mt-4 max-w-sm">
            <div className="mb-1 flex justify-between text-xs text-slate-500">
              <span>Overall progress</span>
              <span>{update.percentComplete}%</span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-label="Overall progress"
              aria-valuenow={update.percentComplete}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="h-full rounded-full bg-brand-600" style={{ width: `${update.percentComplete}%` }} />
            </div>
          </div>
        ) : null}
        {canDelete ? (
          <div className="mt-4 border-t border-slate-100 pt-3">
            <DeleteUpdateButton updateId={update.id} projectId={projectId} />
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
