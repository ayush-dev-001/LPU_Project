"use client";

import { useActionState } from "react";
import { Field, FormMessage, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { createUser } from "./actions";
import { TempPassword } from "./temp-password";

export function AddUserForm() {
  const [state, action] = useActionState(createUser, undefined);

  return (
    <div className="space-y-4">
      {state?.tempPassword ? <TempPassword password={state.tempPassword} forName={state.forName} /> : null}
      {/* key clears the inputs after a user is created */}
      <form key={state?.tempPassword ?? "new"} action={action} className="grid gap-4 sm:grid-cols-[1fr_1fr_10rem_auto] sm:items-start">
        <div className="sm:col-span-4">
          <FormMessage error={state?.fieldErrors ? undefined : state?.error} />
        </div>
        <Field label="Full name" htmlFor="new-name" errors={state?.fieldErrors?.name}>
          <Input id="new-name" name="name" required />
        </Field>
        <Field label="Email" htmlFor="new-email" errors={state?.fieldErrors?.email}>
          <Input id="new-email" name="email" type="email" required />
        </Field>
        <Field label="Role" htmlFor="new-role">
          <Select id="new-role" name="role" defaultValue="MEMBER">
            <option value="MEMBER">Member</option>
            <option value="MANAGER">Manager</option>
            <option value="ADMIN">Admin</option>
          </Select>
        </Field>
        <div className="sm:pt-6">
          <SubmitButton pendingText="Adding…">Add user</SubmitButton>
        </div>
      </form>
    </div>
  );
}
