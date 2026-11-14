"use client";

import { useActionState } from "react";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { changePassword, updateName } from "./actions";

export function NameForm({ name }: { name: string }) {
  const [state, action] = useActionState(updateName, undefined);
  return (
    <form action={action} className="space-y-4">
      <FormMessage error={state?.fieldErrors ? undefined : state?.error} success={state?.success} />
      <Field label="Full name" htmlFor="name" errors={state?.fieldErrors?.name}>
        <Input id="name" name="name" defaultValue={name} autoComplete="name" required />
      </Field>
      <SubmitButton>Save name</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, undefined);
  return (
    // key resets the inputs after a successful change
    <form key={state?.success ? "done" : "form"} action={action} className="space-y-4">
      <FormMessage error={state?.fieldErrors ? undefined : state?.error} success={state?.success} />
      <Field label="Current password" htmlFor="currentPassword" errors={state?.fieldErrors?.currentPassword}>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
      </Field>
      <Field
        label="New password"
        htmlFor="newPassword"
        errors={state?.fieldErrors?.newPassword}
        hint="At least 8 characters, with a letter and a number."
      >
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required />
      </Field>
      <Field label="Confirm new password" htmlFor="confirmPassword" errors={state?.fieldErrors?.confirmPassword}>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
      </Field>
      <SubmitButton pendingText="Changing…">Change password</SubmitButton>
    </form>
  );
}
