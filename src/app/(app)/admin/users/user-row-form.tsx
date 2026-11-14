"use client";

import { useActionState } from "react";
import { Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateUser } from "./actions";

export function UserRowForm({
  userId,
  role,
  isActive,
  isSelf,
}: {
  userId: string;
  role: string;
  isActive: boolean;
  isSelf: boolean;
}) {
  const [state, action] = useActionState(updateUser, undefined);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <Select name="role" defaultValue={role} className="h-8 w-32" aria-label="Role" disabled={isSelf}>
        <option value="ADMIN">Admin</option>
        <option value="MANAGER">Manager</option>
        <option value="MEMBER">Member</option>
      </Select>
      <Select
        name="isActive"
        defaultValue={String(isActive)}
        className="h-8 w-28"
        aria-label="Status"
        disabled={isSelf}
      >
        <option value="true">Active</option>
        <option value="false">Inactive</option>
      </Select>
      {isSelf ? (
        <span className="text-xs text-slate-500">You</span>
      ) : (
        <SubmitButton size="sm" variant="outline">
          Save
        </SubmitButton>
      )}
      {state?.error ? <span className="text-xs text-red-600">{state.error}</span> : null}
      {state?.success ? <span className="text-xs text-emerald-600">{state.success}</span> : null}
    </form>
  );
}
