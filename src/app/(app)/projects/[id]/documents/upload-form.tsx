"use client";

import { useActionState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, FormMessage, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { deleteDocument, uploadDocument } from "./actions";

const acceptedFiles = ".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip";

export function DocumentUploadForm({
  projectId,
  tasks,
}: {
  projectId: string;
  tasks: { id: string; title: string }[];
}) {
  const [state, action] = useActionState(uploadDocument, undefined);
  return (
    <Card>
      <CardHeader title="Upload a document" description="PDF, images, Office files, text, CSV or ZIP; up to 10 MB." />
      <CardBody>
        <form action={action} className="grid gap-4 sm:grid-cols-2">
          <FormMessage error={state?.fieldErrors ? undefined : state?.error} success={state?.success} />
          <input type="hidden" name="projectId" value={projectId} />
          <Field label="File" htmlFor="document-file" errors={state?.fieldErrors?.file}>
            <input id="document-file" name="file" type="file" accept={acceptedFiles} required className="block min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-sm" />
          </Field>
          <Field label="Related task (optional)" htmlFor="document-task" errors={state?.fieldErrors?.taskId}>
            <Select id="document-task" name="taskId" defaultValue="">
              <option value="">No related task</option>
              {tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <SubmitButton>Upload document</SubmitButton>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

export function DeleteDocumentButton({
  projectId,
  documentId,
  name,
}: {
  projectId: string;
  documentId: string;
  name: string;
}) {
  const [state, action] = useActionState(deleteDocument, undefined);
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(`Delete “${name}”?`)) event.preventDefault();
      }}
    >
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="documentId" value={documentId} />
      <SubmitButton variant="ghost" size="sm" className="text-red-700 hover:bg-red-50" pendingText="Deleting…">Delete</SubmitButton>
      {state?.error ? <p role="alert" className="mt-1 text-xs text-red-700">{state.error}</p> : null}
    </form>
  );
}
