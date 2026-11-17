"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Field, FormMessage, Input, Label, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { toDateInputValue } from "@/lib/utils";
import type { ActionState } from "@/lib/action-state";
import type { ProjectStatus, Role } from "@/generated/prisma/enums";

type UserOption = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

type InitialData = {
  id?: string;
  name: string;
  code: string;
  description?: string | null;
  status: ProjectStatus;
  startDate: Date | string;
  endDate: Date | string;
  budget: number;
  managerId: string;
  memberIds: string[];
};

type ProjectFormProps = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initialData?: InitialData;
  eligibleManagers: UserOption[];
  eligibleMembers: UserOption[];
  currentUser: {
    id: string;
    name?: string;
    role: Role;
  };
};

const PROJECT_STATUSES: { label: string; value: ProjectStatus }[] = [
  { label: "Planning", value: "PLANNING" },
  { label: "Active", value: "ACTIVE" },
  { label: "On hold", value: "ON_HOLD" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
];

export function ProjectForm({
  action,
  initialData,
  eligibleManagers,
  eligibleMembers,
  currentUser,
}: ProjectFormProps) {
  const [state, formAction] = useActionState(action, undefined);
  const isEditing = Boolean(initialData?.id);
  const isAdmin = currentUser.role === "ADMIN";

  const defaultManagerId =
    initialData?.managerId ?? (isAdmin ? eligibleManagers[0]?.id ?? currentUser.id : currentUser.id);

  const [selectedManagerId, setSelectedManagerId] = useState<string>(defaultManagerId);

  // Exclude current manager from selectable members
  const availableMembers = eligibleMembers.filter((m) => m.id !== selectedManagerId);

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {initialData?.id && <input type="hidden" name="projectId" value={initialData.id} />}

      <FormMessage
        error={state?.fieldErrors ? undefined : state?.error}
        success={state?.success}
      />

      <Card>
        <CardBody className="space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Field label="Project name" htmlFor="name" errors={state?.fieldErrors?.name}>
                <Input
                  id="name"
                  name="name"
                  defaultValue={initialData?.name ?? ""}
                  placeholder="e.g. Website Redesign"
                  required
                />
              </Field>
            </div>

            <div>
              <Field
                label="Code"
                htmlFor="code"
                errors={state?.fieldErrors?.code}
                hint="e.g. PRJ-001"
              >
                <Input
                  id="code"
                  name="code"
                  defaultValue={initialData?.code ?? ""}
                  placeholder="PRJ-001"
                  required
                  className="font-mono uppercase"
                />
              </Field>
            </div>
          </div>

          <Field
            label="Description"
            htmlFor="description"
            errors={state?.fieldErrors?.description}
            hint="Optional. Max 2000 characters."
          >
            <Textarea
              id="description"
              name="description"
              defaultValue={initialData?.description ?? ""}
              placeholder="Brief summary of the project goals..."
              rows={3}
            />
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <Field label="Status" htmlFor="status" errors={state?.fieldErrors?.status}>
                <Select
                  id="status"
                  name="status"
                  defaultValue={initialData?.status ?? "PLANNING"}
                >
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div>
              <Field
                label="Budget (₹)"
                htmlFor="budget"
                errors={state?.fieldErrors?.budget}
                hint="Planned budget in whole rupees"
              >
                <Input
                  id="budget"
                  name="budget"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={initialData?.budget ?? 0}
                  required
                />
              </Field>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <Field label="Start date" htmlFor="startDate" errors={state?.fieldErrors?.startDate}>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  defaultValue={toDateInputValue(initialData?.startDate ?? new Date())}
                  required
                />
              </Field>
            </div>

            <div>
              <Field label="End date" htmlFor="endDate" errors={state?.fieldErrors?.endDate}>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  defaultValue={toDateInputValue(initialData?.endDate ?? new Date())}
                  required
                />
              </Field>
            </div>
          </div>

          <div>
            <Field label="Project Manager" htmlFor="managerId" errors={state?.fieldErrors?.managerId}>
              {isAdmin ? (
                <Select
                  id="managerId"
                  name="managerId"
                  value={selectedManagerId}
                  onChange={(e) => setSelectedManagerId(e.target.value)}
                >
                  {eligibleManagers.map((mgr) => (
                    <option key={mgr.id} value={mgr.id}>
                      {mgr.name} ({mgr.email})
                    </option>
                  ))}
                </Select>
              ) : (
                <div>
                  <input type="hidden" name="managerId" value={currentUser.id} />
                  <Input
                    id="managerId-display"
                    value={`${currentUser.name} (You)`}
                    disabled
                    readOnly
                  />
                </div>
              )}
            </Field>
          </div>

          <div>
            <Label className="mb-2">Team Members</Label>
            <p className="mb-3 text-xs text-slate-500">
              Select members who can view and contribute to this project.
            </p>
            {availableMembers.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No other users available.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 max-h-56 overflow-y-auto rounded-md border border-slate-200 p-3">
                {availableMembers.map((member) => {
                  const isChecked = initialData?.memberIds?.includes(member.id);
                  return (
                    <label
                      key={member.id}
                      className="flex items-center gap-2.5 rounded-sm p-1.5 hover:bg-slate-50 text-sm cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        name="memberIds"
                        value={member.id}
                        defaultChecked={isChecked}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-slate-800 font-medium">{member.name}</span>
                      <span className="text-xs text-slate-400">({member.email})</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Link
          href={isEditing && initialData?.id ? `/projects/${initialData.id}` : "/projects"}
          className={buttonClasses("outline", "md")}
        >
          Cancel
        </Link>
        <SubmitButton pendingText={isEditing ? "Saving changes…" : "Creating project…"}>
          {isEditing ? "Save changes" : "Create project"}
        </SubmitButton>
      </div>
    </form>
  );
}

export function DeleteProjectCard({
  projectId,
  projectCode,
  deleteAction,
}: {
  projectId: string;
  projectCode: string;
  deleteAction: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction] = useActionState(deleteAction, undefined);
  const [code, setCode] = useState("");

  return (
    <Card className="border-red-200">
      <CardBody className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-red-700">Danger zone</h2>
          <p className="mt-1 text-sm text-slate-600">
            Deleting this project permanently deletes all associated milestones, tasks,
            updates, documents, and expenses. This action cannot be undone.
          </p>
        </div>

        <form action={formAction} className="space-y-4" noValidate>
          <input type="hidden" name="projectId" value={projectId} />

          <FormMessage
            error={state?.fieldErrors ? undefined : state?.error}
            success={state?.success}
          />

          <Field
            label={`To confirm, type "${projectCode}" below:`}
            htmlFor="confirmCode"
            errors={state?.fieldErrors?.confirmCode}
          >
            <Input
              id="confirmCode"
              name="confirmCode"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={projectCode}
              required
              className="font-mono uppercase"
            />
          </Field>

          <div className="flex justify-end">
            <SubmitButton
              variant="danger"
              pendingText="Deleting project…"
              disabled={code.trim().toUpperCase() !== projectCode.toUpperCase()}
            >
              Delete project
            </SubmitButton>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

