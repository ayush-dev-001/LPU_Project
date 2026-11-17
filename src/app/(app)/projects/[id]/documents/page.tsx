import { FileText } from "lucide-react";
import { EmptyState } from "@/components/ui/page";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProjectAccess } from "@/lib/permissions";
import { formatDate, humanize } from "@/lib/utils";
import { DocumentUploadForm, DeleteDocumentButton } from "./upload-form";

function sizeLabel(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function ProjectDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);
  const access = await getProjectAccess(user, id);
  const [documents, tasks] = await Promise.all([
    db.document.findMany({
      where: { projectId: access.project.id },
      include: {
        task: { select: { id: true, title: true } },
        uploadedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    access.isMember
      ? db.task.findMany({
          where: { projectId: access.project.id },
          select: { id: true, title: true },
          orderBy: { title: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      {access.isMember ? <DocumentUploadForm projectId={access.project.id} tasks={tasks} /> : null}
      {documents.length === 0 ? (
        <EmptyState icon={FileText} title="No documents yet" description="Project files will appear here." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Document</th>
                <th className="px-4 py-3">Related task</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Uploaded by</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map((document) => {
                const canDelete = access.canManage || document.uploadedById === user.id;
                return (
                  <tr key={document.id}>
                    <td className="px-4 py-3">
                      <a href={document.url} className="inline-flex items-center gap-2 font-medium text-brand-700 hover:underline">
                        <FileText className="size-4 shrink-0" aria-hidden />
                        <span className="max-w-72 truncate">{document.name}</span>
                      </a>
                      <p className="mt-1 text-xs text-slate-500">{humanize(document.mimeType.split("/").pop() ?? "file")}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{document.task?.title ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{sizeLabel(document.size)}</td>
                    <td className="px-4 py-3 text-slate-600">{document.uploadedBy.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(document.createdAt)}</td>
                    <td className="px-4 py-3">
                      {canDelete ? (
                        <DeleteDocumentButton projectId={access.project.id} documentId={document.id} name={document.name} />
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
