"use client";

import { useActionState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, FormMessage, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { deleteUpdate, postUpdate } from "./actions";

export function UpdateForm({ projectId }: { projectId: string }) {
  const [state, action] = useActionState(postUpdate, undefined);
  return (
    <Card>
      <CardHeader title="Post a progress update" description="Share what moved forward and flag anything blocking the work." />
      <CardBody>
        <form action={action} className="space-y-4">
          <FormMessage error={state?.fieldErrors ? undefined : state?.error} success={state?.success} />
          <input type="hidden" name="projectId" value={projectId} />
          <Field label="What did you get done?" htmlFor="summary" errors={state?.fieldErrors?.summary}>
            <Textarea id="summary" name="summary" required minLength={5} maxLength={2000} />
          </Field>
          <Field label="Anything blocking you?" htmlFor="blockers" errors={state?.fieldErrors?.blockers}>
            <Textarea id="blockers" name="blockers" maxLength={1000} />
          </Field>
          <Field label="Overall progress %" htmlFor="percentComplete" errors={state?.fieldErrors?.percentComplete}>
            <Input id="percentComplete" name="percentComplete" type="number" min={0} max={100} step={1} />
          </Field>
          <SubmitButton>Post update</SubmitButton>
        </form>
      </CardBody>
    </Card>
  );
}

export function DeleteUpdateButton({ updateId, projectId }: { updateId: string; projectId: string }) {
  const [state, action] = useActionState(deleteUpdate, undefined);
  return (
    <form
      action={action}
      className="flex items-center gap-2"
      onSubmit={(event) => {
        if (!window.confirm("Delete this progress update?")) event.preventDefault();
      }}
    >
      <input type="hidden" name="updateId" value={updateId} />
      <input type="hidden" name="projectId" value={projectId} />
      <SubmitButton variant="ghost" size="sm" className="text-red-700 hover:bg-red-50" pendingText="Deleting…">
        Delete
      </SubmitButton>
      {state?.error ? <span role="alert" className="text-xs text-red-700">{state.error}</span> : null}
    </form>
  );
}
