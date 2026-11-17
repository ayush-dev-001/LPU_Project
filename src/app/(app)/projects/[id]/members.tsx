"use client";

import { useActionState, useState } from "react";
import { UserPlus, Trash2, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Select, FormMessage } from "@/components/ui/form";
import { initials } from "@/lib/utils";
import { addMember, removeMember } from "./actions";

type MemberUser = {
  id: string;
  name: string;
  email: string;
};

type MemberWithTasks = {
  user: MemberUser;
  undoneTaskCount: number;
};

type MembersProps = {
  projectId: string;
  canManage: boolean;
  manager: MemberUser;
  members: MemberWithTasks[];
  availableUsers: MemberUser[];
};

export function MembersCard({
  projectId,
  canManage,
  manager,
  members,
  availableUsers,
}: MembersProps) {
  const [addState, addAction] = useActionState(addMember, undefined);
  const [removeState, removeAction] = useActionState(removeMember, undefined);
  const [isAdding, setIsAdding] = useState(false);
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader
        title="Project team"
        description={`${members.length + 1} ${members.length === 0 ? "person" : "people"} on this project`}
        action={
          canManage && availableUsers.length > 0 && !isAdding ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(true)}
            >
              <UserPlus className="size-3.5" aria-hidden /> Add member
            </Button>
          ) : null
        }
      />

      <CardBody className="space-y-4">
        <FormMessage error={addState?.error || removeState?.error} success={addState?.success || removeState?.success} />

        {/* Add Member form */}
        {canManage && isAdding && availableUsers.length > 0 && (
          <form
            action={async (formData) => {
              await addAction(formData);
              setIsAdding(false);
            }}
            className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-3"
          >
            <input type="hidden" name="projectId" value={projectId} />
            <div className="flex-1">
              <Select name="userId" defaultValue="" required className="h-9">
                <option value="" disabled>
                  Select a user to add…
                </option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </Select>
            </div>
            <SubmitButton size="sm" pendingText="Adding…">
              Add
            </SubmitButton>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsAdding(false)}
            >
              Cancel
            </Button>
          </form>
        )}

        {/* Team list */}
        <ul className="divide-y divide-slate-100">
          {/* Manager row */}
          <li className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                {initials(manager.name)}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">{manager.name}</p>
                <p className="text-xs text-slate-500">{manager.email}</p>
              </div>
            </div>
            <Badge tone="blue">Manager</Badge>
          </li>

          {/* Members */}
          {members.map(({ user, undoneTaskCount }) => (
            <li key={user.id} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                  {initials(user.name)}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                  {undoneTaskCount > 0 && (
                    <p className="flex items-center gap-1 mt-0.5 text-xs text-amber-700">
                      <AlertCircle className="size-3" aria-hidden />
                      {undoneTaskCount} active task{undoneTaskCount === 1 ? "" : "s"}
                    </p>
                  )}
                </div>
              </div>

              {canManage && (
                confirmingRemoveId === user.id ? (
                  <form
                    action={async (formData) => {
                      await removeAction(formData);
                      setConfirmingRemoveId(null);
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <input type="hidden" name="projectId" value={projectId} />
                    <input type="hidden" name="userId" value={user.id} />
                    <span className="text-xs font-medium text-red-600">Remove?</span>
                    <SubmitButton
                      variant="danger"
                      size="sm"
                      pendingText="…"
                      className="h-7 px-2 text-xs"
                    >
                      Yes
                    </SubmitButton>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmingRemoveId(null)}
                      className="h-7 px-2 text-xs"
                    >
                      Cancel
                    </Button>
                  </form>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmingRemoveId(user.id)}
                    className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 h-auto"
                    title={`Remove ${user.name}`}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    <span className="sr-only">Remove {user.name}</span>
                  </Button>
                )
              )}
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
