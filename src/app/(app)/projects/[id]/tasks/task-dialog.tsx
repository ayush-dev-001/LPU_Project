"use client";

import { useActionState, useState, useEffect } from "react";
import { X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input, Textarea, Select, Field, FormMessage } from "@/components/ui/form";
import { toDateInputValue } from "@/lib/utils";
import { createTask, updateTask, deleteTask } from "./actions";
import type { ActionState } from "@/lib/action-state";
import type { TaskPriority, TaskStatus } from "@/generated/prisma/enums";

export type TaskItem = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  milestoneId: string | null;
  startDate: Date | string | null;
  dueDate: Date | string | null;
  position: number;
  assignee?: { id: string; name: string; email: string } | null;
  milestone?: { id: string; title: string } | null;
};

type OptionUser = {
  id: string;
  name: string;
  email: string;
};

type OptionMilestone = {
  id: string;
  title: string;
};

type TaskDialogProps = {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  task?: TaskItem | null;
  defaultStatus?: TaskStatus;
  canManage: boolean;
  isAssignee: boolean;
  assigneeOptions: OptionUser[];
  milestoneOptions: OptionMilestone[];
};

export function TaskDialog({
  projectId,
  isOpen,
  onClose,
  task,
  defaultStatus = "TODO",
  canManage,
  isAssignee,
  assigneeOptions,
  milestoneOptions,
}: TaskDialogProps) {
  const isEditing = Boolean(task?.id);
  const isMemberOnly = isEditing && !canManage && isAssignee;

  const [state, formAction] = useActionState(isEditing ? updateTask : createTask, undefined);
  const [deleteState, deleteAction] = useActionState(deleteTask, undefined);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (state?.success) {
      onClose();
    }
  }, [state?.success, onClose]);

  useEffect(() => {
    if (deleteState?.success) {
      onClose();
    }
  }, [deleteState?.success, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h2 className="text-base font-semibold text-slate-900">
            {isEditing ? (isMemberOnly ? "Update your task" : "Edit task") : "New task"}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 h-auto"
          >
            <X className="size-4" aria-hidden />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        <form action={formAction} className="mt-4 space-y-4" noValidate>
          <input type="hidden" name="projectId" value={projectId} />
          {task?.id && <input type="hidden" name="taskId" value={task.id} />}

          <FormMessage
            error={state?.fieldErrors ? undefined : state?.error}
            success={state?.success}
          />

          {isMemberOnly && (
            <p className="rounded-md bg-slate-50 p-2 text-xs text-slate-600">
              As a team member, you can update the <strong>status</strong> and <strong>description</strong> of your assigned task.
            </p>
          )}

          <Field
            label="Title"
            htmlFor="task-title"
            errors={state?.fieldErrors?.title}
          >
            <Input
              id="task-title"
              name="title"
              defaultValue={task?.title ?? ""}
              required
              disabled={isMemberOnly}
              placeholder="e.g. Design homepage wireframe"
            />
          </Field>

          <Field
            label="Description"
            htmlFor="task-description"
            errors={state?.fieldErrors?.description}
            hint="Max 5000 characters."
          >
            <Textarea
              id="task-description"
              name="description"
              defaultValue={task?.description ?? ""}
              rows={3}
              placeholder="Optional task details or notes…"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Status" htmlFor="task-status" errors={state?.fieldErrors?.status}>
              <Select
                id="task-status"
                name="status"
                defaultValue={task?.status ?? defaultStatus}
              >
                <option value="TODO">To do</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="IN_REVIEW">In review</option>
                <option value="DONE">Done</option>
              </Select>
            </Field>

            <Field label="Priority" htmlFor="task-priority" errors={state?.fieldErrors?.priority}>
              <Select
                id="task-priority"
                name="priority"
                defaultValue={task?.priority ?? "MEDIUM"}
                disabled={isMemberOnly}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Assignee" htmlFor="task-assigneeId" errors={state?.fieldErrors?.assigneeId}>
              <Select
                id="task-assigneeId"
                name="assigneeId"
                defaultValue={task?.assigneeId ?? ""}
                disabled={isMemberOnly}
              >
                <option value="">Unassigned</option>
                {assigneeOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Milestone" htmlFor="task-milestoneId" errors={state?.fieldErrors?.milestoneId}>
              <Select
                id="task-milestoneId"
                name="milestoneId"
                defaultValue={task?.milestoneId ?? ""}
                disabled={isMemberOnly}
              >
                <option value="">None</option>
                {milestoneOptions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Start date" htmlFor="task-startDate" errors={state?.fieldErrors?.startDate}>
              <Input
                id="task-startDate"
                name="startDate"
                type="date"
                defaultValue={toDateInputValue(task?.startDate)}
                disabled={isMemberOnly}
              />
            </Field>

            <Field label="Due date" htmlFor="task-dueDate" errors={state?.fieldErrors?.dueDate}>
              <Input
                id="task-dueDate"
                name="dueDate"
                type="date"
                defaultValue={toDateInputValue(task?.dueDate)}
                disabled={isMemberOnly}
              />
            </Field>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {canManage && isEditing && task ? (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-600 font-medium">Delete task?</span>
                  <SubmitButton
                    formAction={deleteAction}
                    variant="danger"
                    size="sm"
                    pendingText="Deleting…"
                  >
                    Yes
                  </SubmitButton>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(true)}
                  className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="size-4 mr-1.5" /> Delete
                </Button>
              )
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <SubmitButton size="sm" pendingText="Saving…">
                {isEditing ? "Save changes" : "Create task"}
              </SubmitButton>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export function StatusSelect({
  taskId,
  currentStatus,
  action,
}: {
  taskId: string;
  currentStatus: TaskStatus;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex items-center gap-1.5">
      <input type="hidden" name="taskId" value={taskId} />
      <Select
        name="status"
        defaultValue={currentStatus}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-8 text-xs min-w-[125px]"
      >
        <option value="TODO">To do</option>
        <option value="IN_PROGRESS">In progress</option>
        <option value="IN_REVIEW">In review</option>
        <option value="DONE">Done</option>
      </Select>
    </form>
  );
}

