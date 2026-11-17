"use client";

import { useActionState } from "react";
import { Zap } from "lucide-react";
import { SubmitButton } from "@/components/ui/submit-button";
import { runAlertsNow } from "./actions";

/** Admin-only: run the daily due-date alerts immediately. */
export function RunAlertsButton() {
  const [state, action] = useActionState(runAlertsNow, undefined);
  return (
    <form action={action} className="flex items-center gap-3">
      {state?.success ? (
        <span role="status" className="text-sm text-emerald-700">
          {state.success}
        </span>
      ) : null}
      <SubmitButton variant="outline" size="sm" pendingText="Running…">
        <Zap className="size-4" aria-hidden /> Run alerts now
      </SubmitButton>
    </form>
  );
}
