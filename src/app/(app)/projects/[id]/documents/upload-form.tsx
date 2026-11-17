"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, FormMessage, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { deleteDocument, uploadDocument } from "./actions";
import { ACCEPT, MAX_UPLOAD_BYTES } from "./file-types";

export function UploadForm({ projectId, tasks }: { projectId: string; tasks: { id: string; title: string }[] }) {
  const [state, action] = useActionState(uploadDocument, undefined);
  const [sizeError, setSizeError] = useState<string | null>(null);
  // Clear the form after each successful upload (adjusting state during render, not in an effect).
  const [formKey, setFormKey] = useState(0);
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (state?.success) setFormKey((k) => k + 1);
  }

  const fileErrors = sizeError ? [sizeError] : state?.fieldErrors?.file;

  return (
    <Card>
      <CardHeader title="Upload a document" description="PDF, images, Office files, text, CSV or ZIP, up to 10 MB." />
      <CardBody>
        <form key={formKey} action={action} className="space-y-4">
          <input type="hidden" name="projectId" value={projectId} />
          <FormMessage error={sizeError ? "That file is too big." : state?.error} success={state?.success} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="File" htmlFor="file" errors={fileErrors}>
              <Input
                id="file"
                name="file"
                type="file"
                accept={ACCEPT}
                required
                onChange={(e) => {
                  // Catch big files as soon as they are picked, before any upload starts.
                  // Clearing the input means the required field blocks submitting it.
                  const file = e.currentTarget.files?.[0];
                  if (file && file.size > MAX_UPLOAD_BYTES) {
                    e.currentTarget.value = "";
                    setSizeError(`${file.name} is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Files can be at most 10 MB.`);
                  } else {
                    setSizeError(null);
                  }
                }}
                className="h-auto py-1.5 file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-sm file:font-medium file:text-slate-700"
                aria-invalid={!!fileErrors}
              />
            </Field>
            <Field label="Related task" htmlFor="taskId" errors={state?.fieldErrors?.taskId} hint="Optional">
              <Select id="taskId" name="taskId" defaultValue="">
                <option value="">None</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="flex justify-end">
            <SubmitButton pendingText="Uploading…">Upload</SubmitButton>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

export function DeleteDocumentButton({ id, projectId, name }: { id: string; projectId: string; name: string }) {
  const [state, action] = useActionState(deleteDocument, undefined);
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirming(true)} aria-label={`Delete ${name}`}>
        <Trash2 className="size-4" aria-hidden />
      </Button>
    );
  }
  return (
    <form action={action} className="flex flex-wrap items-center justify-end gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="projectId" value={projectId} />
      {state?.error ? <span className="text-xs text-red-600">{state.error}</span> : null}
      <SubmitButton variant="danger" size="sm" pendingText="Deleting…">
        Delete
      </SubmitButton>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
    </form>
  );
}
