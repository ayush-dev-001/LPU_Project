import { File, FileArchive, FileImage, FileSpreadsheet, FileText, Presentation, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/page";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProjectAccess } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import { extensionOf, formatBytes } from "./file-types";
import { DeleteDocumentButton, UploadForm } from "./upload-form";

const icons: Record<string, LucideIcon> = {
  pdf: FileText,
  doc: FileText,
  docx: FileText,
  txt: FileText,
  png: FileImage,
  jpg: FileImage,
  jpeg: FileImage,
  webp: FileImage,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  csv: FileSpreadsheet,
  ppt: Presentation,
  pptx: Presentation,
  zip: FileArchive,
};

export default async function DocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const access = await getProjectAccess(user, id);
  const projectId = access.project.id;

  const [documents, tasks] = await Promise.all([
    db.document.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        url: true,
        size: true,
        createdAt: true,
        uploadedById: true,
        uploadedBy: { select: { name: true } },
        task: { select: { title: true } },
      },
    }),
    access.isMember
      ? db.task.findMany({ where: { projectId }, orderBy: { title: "asc" }, select: { id: true, title: true } })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      {access.isMember ? <UploadForm projectId={projectId} tasks={tasks} /> : null}

      {documents.length === 0 ? (
        <EmptyState
          icon={File}
          title="No documents yet"
          description={access.isMember ? "Upload plans, reports or photos so the whole team can find them." : undefined}
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-4 py-2.5 font-medium">Related task</th>
                  <th className="px-4 py-2.5 text-right font-medium">Size</th>
                  <th className="px-4 py-2.5 font-medium">Uploaded by</th>
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {documents.map((d) => {
                  const Icon = icons[extensionOf(d.name)] ?? File;
                  return (
                    <tr key={d.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <a
                          href={d.url}
                          className="inline-flex max-w-xs items-center gap-2 font-medium text-slate-900 hover:text-brand-700 hover:underline"
                        >
                          <Icon className="size-4 shrink-0 text-slate-400" aria-hidden />
                          <span className="truncate">{d.name}</span>
                        </a>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{d.task?.title ?? "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-600">{formatBytes(d.size)}</td>
                      <td className="px-4 py-3 text-slate-600">{d.uploadedBy.name}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(d.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        {d.uploadedById === user.id || access.canManage ? (
                          <DeleteDocumentButton id={d.id} projectId={projectId} name={d.name} />
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
