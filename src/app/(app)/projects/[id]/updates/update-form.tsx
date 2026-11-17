"use client";

import { useActionState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, FormMessage, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { postUpdate } from "./actions";

export function UpdateForm({ projectId }: { projectId: string }) {
  const [state, action] = useActionState(postUpdate, undefined);
  const errors = state?.fieldErrors;

  return (
    <Card>
      <CardHeader title="Post an update" description="Share what you did and flag anything that is holding you up." />
      <CardBody>
        <form action={action} className="space-y-4">
          <input type="hidden" name="projectId" value={projectId} />
          <FormMessage error={state?.error} success={state?.success} />

          <Field label="What did you get done?" htmlFor="summary" errors={errors?.summary}>
            <Textarea id="summary" name="summary" required minLength={5} maxLength={2000} aria-invalid={!!errors?.summary} />
          </Field>

          <Field
            label="Anything blocking you?"
            htmlFor="blockers"
            errors={errors?.blockers}
            hint="Optional. The project manager is notified when you report a blocker."
          >
            <Textarea id="blockers" name="blockers" maxLength={1000} className="min-h-16" aria-invalid={!!errors?.blockers} />
          </Field>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="w-40">
              <Field label="Overall progress %" htmlFor="percentComplete" errors={errors?.percentComplete}>
                <Input
                  id="percentComplete"
                  name="percentComplete"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  step={1}
                  aria-invalid={!!errors?.percentComplete}
                />
              </Field>
            </div>
            <SubmitButton pendingText="Posting…">Post update</SubmitButton>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
