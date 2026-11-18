"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { deleteUpdate } from "@/app/(app)/projects/[id]/updates/actions";

/** Delete with an inline "are you sure?" step. */
export function DeleteUpdateButton({ id, projectId }: { id: string; projectId: string }) {
  const [state, action] = useActionState(deleteUpdate, undefined);
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirming(true)} aria-label="Delete update">
        <Trash2 className="size-4" aria-hidden />
      </Button>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="projectId" value={projectId} />
      <span className="text-xs text-slate-600">Delete this update?</span>
      <SubmitButton variant="danger" size="sm" pendingText="Deleting…">
        Delete
      </SubmitButton>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
      {state?.error ? <span className="text-xs text-red-600">{state.error}</span> : null}
    </form>
  );
}
