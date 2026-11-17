import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatDateTime, initials } from "@/lib/utils";
import { relativeTime } from "./relative-time";
import { DeleteUpdateButton } from "./delete-update-button";

export type UpdateCardData = {
  id: string;
  projectId: string;
  summary: string;
  blockers: string | null;
  percentComplete: number | null;
  createdAt: Date;
  author: { name: string };
  /** Shown in the global feed; left out on the project's own tab. */
  project?: { id: string; code: string; name: string };
};

/** One progress update. Used by the project Updates tab and the global /updates feed. */
export function UpdateCard({ update, canDelete }: { update: UpdateCardData; canDelete: boolean }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700"
          aria-hidden
        >
          {initials(update.author.name)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900">{update.author.name}</p>
              <p className="text-xs text-slate-500">
                <time dateTime={update.createdAt.toISOString()} title={formatDateTime(update.createdAt)}>
                  {relativeTime(update.createdAt)}
                </time>
                {update.project ? (
                  <>
                    {" · "}
                    <Link href={`/projects/${update.project.id}/updates`} className="hover:text-brand-700 hover:underline">
                      <span className="font-mono">{update.project.code}</span> {update.project.name}
                    </Link>
                  </>
                ) : null}
              </p>
            </div>
            {canDelete ? <DeleteUpdateButton id={update.id} projectId={update.projectId} /> : null}
          </div>

          <p className="mt-3 whitespace-pre-line break-words text-sm text-slate-700">{update.summary}</p>

          {update.blockers ? (
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                <TriangleAlert className="size-3.5" aria-hidden /> Blocker
              </p>
              <p className="mt-1 whitespace-pre-line break-words text-sm text-amber-900">{update.blockers}</p>
            </div>
          ) : null}

          {update.percentComplete !== null ? (
            <div className="mt-3 flex items-center gap-3">
              <div
                className="h-1.5 max-w-48 flex-1 overflow-hidden rounded-full bg-slate-100"
                role="progressbar"
                aria-valuenow={update.percentComplete}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Reported progress"
              >
                <div className="h-full rounded-full bg-brand-600" style={{ width: `${update.percentComplete}%` }} />
              </div>
              <span className="text-xs tabular-nums text-slate-600">{update.percentComplete}% complete</span>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
