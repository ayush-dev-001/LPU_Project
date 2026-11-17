"use client";

import { useActionState, useState } from "react";
import { Plus, Pencil, Trash2, Calendar, CheckSquare, X } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input, Textarea, Field, FormMessage } from "@/components/ui/form";
import { formatDate, toDateInputValue, daysFromNow } from "@/lib/utils";
import {
  createMilestone,
  updateMilestone,
  toggleMilestone,
  deleteMilestone,
} from "./actions";
import type { MilestoneStatus } from "@/generated/prisma/enums";

type MilestoneItem = {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | string;
  status: MilestoneStatus;
  completedAt: Date | string | null;
  tasksTotal: number;
  tasksDone: number;
};

type MilestonesProps = {
  projectId: string;
  canManage: boolean;
  milestones: MilestoneItem[];
};

export function MilestonesCard({
  projectId,
  canManage,
  milestones,
}: MilestonesProps) {
  const [createState, createAction] = useActionState(createMilestone, undefined);
  const [updateState, updateAction] = useActionState(updateMilestone, undefined);
  const [deleteState, deleteAction] = useActionState(deleteMilestone, undefined);
  const [toggleState, toggleAction] = useActionState(toggleMilestone, undefined);

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader
        title="Milestones"
        description={`${milestones.filter((m) => m.status === "COMPLETED").length} of ${milestones.length} completed`}
        action={
          canManage && !isCreating ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsCreating(true);
                setEditingId(null);
                setConfirmingDeleteId(null);
              }}
            >
              <Plus className="size-3.5" aria-hidden /> Add milestone
            </Button>
          ) : null
        }
      />

      <CardBody className="space-y-4">
        <FormMessage
          error={
            createState?.error ||
            updateState?.error ||
            deleteState?.error ||
            toggleState?.error
          }
          success={
            createState?.success ||
            updateState?.success ||
            deleteState?.success ||
            toggleState?.success
          }
        />

        {/* Create Milestone Form */}
        {canManage && isCreating && (
          <form
            action={async (formData) => {
              await createAction(formData);
              setIsCreating(false);
            }}
            className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">New Milestone</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsCreating(false)}
              >
                <X className="size-4" />
              </Button>
            </div>

            <input type="hidden" name="projectId" value={projectId} />

            <Field label="Title" htmlFor="create-title" errors={createState?.fieldErrors?.title}>
              <Input
                id="create-title"
                name="title"
                placeholder="e.g. Design Approved"
                required
              />
            </Field>

            <Field
              label="Description"
              htmlFor="create-desc"
              errors={createState?.fieldErrors?.description}
            >
              <Textarea
                id="create-desc"
                name="description"
                placeholder="Optional details…"
                rows={2}
              />
            </Field>

            <Field
              label="Due date"
              htmlFor="create-dueDate"
              errors={createState?.fieldErrors?.dueDate}
            >
              <Input
                id="create-dueDate"
                name="dueDate"
                type="date"
                defaultValue={toDateInputValue(new Date())}
                required
              />
            </Field>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreating(false)}
              >
                Cancel
              </Button>
              <SubmitButton size="sm" pendingText="Saving…">
                Save milestone
              </SubmitButton>
            </div>
          </form>
        )}

        {/* Milestone List */}
        {milestones.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500 italic">
            No milestones added yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {milestones.map((milestone) => {
              const isCompleted = milestone.status === "COMPLETED";
              const daysLeft = daysFromNow(milestone.dueDate);
              const isOverdue = !isCompleted && daysLeft < 0;
              const isDueSoon = !isCompleted && daysLeft >= 0 && daysLeft <= 7;

              if (editingId === milestone.id && canManage) {
                return (
                  <li key={milestone.id} className="py-3">
                    <form
                      action={async (formData) => {
                        await updateAction(formData);
                        setEditingId(null);
                      }}
                      className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-800">
                          Edit Milestone
                        </h3>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingId(null)}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>

                      <input type="hidden" name="projectId" value={projectId} />
                      <input type="hidden" name="milestoneId" value={milestone.id} />

                      <Field
                        label="Title"
                        htmlFor={`edit-title-${milestone.id}`}
                        errors={updateState?.fieldErrors?.title}
                      >
                        <Input
                          id={`edit-title-${milestone.id}`}
                          name="title"
                          defaultValue={milestone.title}
                          required
                        />
                      </Field>

                      <Field
                        label="Description"
                        htmlFor={`edit-desc-${milestone.id}`}
                        errors={updateState?.fieldErrors?.description}
                      >
                        <Textarea
                          id={`edit-desc-${milestone.id}`}
                          name="description"
                          defaultValue={milestone.description ?? ""}
                          rows={2}
                        />
                      </Field>

                      <Field
                        label="Due date"
                        htmlFor={`edit-dueDate-${milestone.id}`}
                        errors={updateState?.fieldErrors?.dueDate}
                      >
                        <Input
                          id={`edit-dueDate-${milestone.id}`}
                          name="dueDate"
                          type="date"
                          defaultValue={toDateInputValue(milestone.dueDate)}
                          required
                        />
                      </Field>

                      <div className="flex justify-end gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </Button>
                        <SubmitButton size="sm" pendingText="Updating…">
                          Save changes
                        </SubmitButton>
                      </div>
                    </form>
                  </li>
                );
              }

              return (
                <li
                  key={milestone.id}
                  className="flex items-start justify-between gap-3 py-3 group"
                >
                  <div className="flex items-start gap-3">
                    {/* Toggle Checkbox */}
                    {canManage ? (
                      <form action={toggleAction} className="pt-0.5">
                        <input type="hidden" name="projectId" value={projectId} />
                        <input type="hidden" name="milestoneId" value={milestone.id} />
                        <input
                          type="hidden"
                          name="completed"
                          value={isCompleted ? "false" : "true"}
                        />
                        <button
                          type="submit"
                          className="text-slate-400 hover:text-brand-600 transition-colors"
                          title={isCompleted ? "Mark incomplete" : "Mark complete"}
                        >
                          <input
                            type="checkbox"
                            checked={isCompleted}
                            readOnly
                            className="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer pointer-events-none"
                          />
                        </button>
                      </form>
                    ) : (
                      <div className="pt-0.5">
                        <input
                          type="checkbox"
                          checked={isCompleted}
                          disabled
                          className="size-4 rounded border-slate-300 text-brand-600 cursor-not-allowed"
                        />
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-sm font-medium ${
                            isCompleted ? "text-slate-400 line-through" : "text-slate-900"
                          }`}
                        >
                          {milestone.title}
                        </p>

                        {/* Milestone Badge */}
                        {isCompleted ? (
                          <Badge tone="green">Done</Badge>
                        ) : isOverdue ? (
                          <Badge tone="red">Overdue</Badge>
                        ) : isDueSoon ? (
                          <Badge tone="amber">Due soon</Badge>
                        ) : null}
                      </div>

                      {milestone.description && (
                        <p className="mt-0.5 text-xs text-slate-500">{milestone.description}</p>
                      )}

                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          {formatDate(milestone.dueDate)}
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckSquare className="size-3" />
                          {milestone.tasksDone}/{milestone.tasksTotal} tasks
                        </span>
                      </div>
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingId(milestone.id);
                          setIsCreating(false);
                          setConfirmingDeleteId(null);
                        }}
                        className="text-slate-400 hover:text-slate-700 p-1.5 h-auto"
                        title="Edit milestone"
                      >
                        <Pencil className="size-3.5" aria-hidden />
                        <span className="sr-only">Edit</span>
                      </Button>

                      {confirmingDeleteId === milestone.id ? (
                        <form
                          action={async (formData) => {
                            await deleteAction(formData);
                            setConfirmingDeleteId(null);
                          }}
                          className="flex items-center gap-1"
                        >
                          <input type="hidden" name="projectId" value={projectId} />
                          <input type="hidden" name="milestoneId" value={milestone.id} />
                          <span className="text-xs font-medium text-red-600">Delete?</span>
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
                            onClick={() => setConfirmingDeleteId(null)}
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
                          onClick={() => setConfirmingDeleteId(milestone.id)}
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 h-auto"
                          title="Delete milestone"
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                          <span className="sr-only">Delete</span>
                        </Button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
