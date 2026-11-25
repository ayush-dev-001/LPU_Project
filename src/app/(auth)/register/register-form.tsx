"use client";

import { useActionState } from "react";
import { register } from "@/app/actions/auth";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

export function RegisterForm() {
  const [state, action] = useActionState(register, undefined);

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage error={state?.fieldErrors ? undefined : state?.error} />
      <Field label="Full name" htmlFor="name" errors={state?.fieldErrors?.name}>
        <Input id="name" name="name" autoComplete="name" required autoFocus />
      </Field>
      <Field label="Email" htmlFor="email" errors={state?.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field
        label="Password"
        htmlFor="password"
        errors={state?.fieldErrors?.password}
        hint="At least 8 characters, with a letter and a number."
      >
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>
      <SubmitButton
        className="w-full cursor-pointer transition-all duration-300 ease-out hover:-translate-y-0.5 hover:scale-[1.015] hover:shadow-[0_12px_28px_-6px_rgba(246,245,244,0.35)] active:translate-y-0 active:scale-[0.98]"
        pendingText="Creating account…"
      >
        Create account
      </SubmitButton>
    </form>
  );
}
