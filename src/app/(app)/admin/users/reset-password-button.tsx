"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { resetPassword } from "./actions";
import { TempPassword } from "./temp-password";

export function ResetPasswordButton({ userId, name }: { userId: string; name: string }) {
  const [state, action] = useActionState(resetPassword, undefined);

  return (
    <div className="space-y-2">
      <form
        action={action}
        onSubmit={(e) => {
          if (!confirm(`Reset ${name}'s password? Their current password will stop working.`)) e.preventDefault();
        }}
      >
        <input type="hidden" name="userId" value={userId} />
        <SubmitButton size="sm" variant="ghost" pendingText="Resetting…">
          Reset password
        </SubmitButton>
      </form>
      {state?.error ? <p className="text-xs text-red-600">{state.error}</p> : null}
      {state?.tempPassword ? <TempPassword password={state.tempPassword} forName={state.forName} /> : null}
    </div>
  );
}
