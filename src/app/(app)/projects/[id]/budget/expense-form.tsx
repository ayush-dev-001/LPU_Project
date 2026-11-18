"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, FormMessage, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDate, formatINR, humanize, toDateInputValue } from "@/lib/utils";
import type { ActionState } from "@/lib/action-state";
import { addExpense, deleteExpense, updateExpense } from "./actions";
import { EXPENSE_CATEGORIES } from "./categories";

export type ExpenseRow = {
  id: string;
  title: string;
  amount: number;
  category: (typeof EXPENSE_CATEGORIES)[number];
  spentOn: Date;
  recordedBy: string;
};

/** Today as YYYY-MM-DD in the viewer's time zone, for the date picker's max. */
function todayInput() {
  const d = new Date();
  return toDateInputValue(new Date(d.getTime() - d.getTimezoneOffset() * 60_000));
}

function ExpenseFields({ state, expense }: { state: ActionState; expense?: ExpenseRow }) {
  const errors = state?.fieldErrors;
  const prefix = expense ? `e-${expense.id}-` : "new-";
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field label="Title" htmlFor={`${prefix}title`} errors={errors?.title}>
          <Input
            id={`${prefix}title`}
            name="title"
            defaultValue={expense?.title}
            required
            minLength={2}
            maxLength={120}
            aria-invalid={!!errors?.title}
          />
        </Field>
      </div>
      <Field label="Amount (₹)" htmlFor={`${prefix}amount`} errors={errors?.amount}>
        <Input
          id={`${prefix}amount`}
          name="amount"
          type="number"
          inputMode="numeric"
          min={1}
          max={10_000_000}
          step={1}
          defaultValue={expense?.amount}
          required
          aria-invalid={!!errors?.amount}
        />
      </Field>
      <Field label="Category" htmlFor={`${prefix}category`} errors={errors?.category}>
        <Select id={`${prefix}category`} name="category" defaultValue={expense?.category ?? "MATERIAL"}>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {humanize(c)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Date" htmlFor={`${prefix}spentOn`} errors={errors?.spentOn}>
        <Input
          id={`${prefix}spentOn`}
          name="spentOn"
          type="date"
          max={todayInput()}
          defaultValue={expense ? toDateInputValue(expense.spentOn) : todayInput()}
          required
          aria-invalid={!!errors?.spentOn}
        />
      </Field>
    </div>
  );
}

// ─────────────── Add ───────────────

export function AddExpense({ projectId }: { projectId: string }) {
  const [state, action] = useActionState(addExpense, undefined);
  const [open, setOpen] = useState(false);
  // A fresh key after each success clears the form for the next entry
  // (adjusting state during render, not in an effect: react.dev "you might not need an effect").
  const [formKey, setFormKey] = useState(0);
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (state?.success) setFormKey((k) => k + 1);
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-3">
        {state?.success ? <span className="text-sm text-emerald-700">{state.success}</span> : null}
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" aria-hidden /> Add expense
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Add expense"
        action={
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} aria-label="Close">
            <X className="size-4" aria-hidden />
          </Button>
        }
      />
      <CardBody>
        <form key={formKey} action={action} className="space-y-4">
          <input type="hidden" name="projectId" value={projectId} />
          <FormMessage error={state?.error} success={state?.success} />
          <ExpenseFields state={state} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton>Add expense</SubmitButton>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

// ─────────────── Table with edit / delete ───────────────

function EditRow({ projectId, expense, onDone }: { projectId: string; expense: ExpenseRow; onDone: () => void }) {
  const [state, action] = useActionState(updateExpense, undefined);
  useEffect(() => {
    if (state?.success) onDone();
  }, [state, onDone]);

  return (
    <tr className="border-t border-slate-100 bg-slate-50">
      <td colSpan={6} className="px-4 py-4">
        <form action={action} className="space-y-4">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="id" value={expense.id} />
          <FormMessage error={state?.error} />
          <ExpenseFields state={state} expense={expense} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onDone}>
              Cancel
            </Button>
            <SubmitButton>Save changes</SubmitButton>
          </div>
        </form>
      </td>
    </tr>
  );
}

function DeleteControl({ projectId, id, onCancel }: { projectId: string; id: string; onCancel: () => void }) {
  const [state, action] = useActionState(deleteExpense, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center justify-end gap-2">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="id" value={id} />
      {state?.error ? <span className="text-xs text-red-600">{state.error}</span> : null}
      <SubmitButton variant="danger" size="sm" pendingText="Deleting…">
        Delete
      </SubmitButton>
      <Button variant="ghost" size="sm" onClick={onCancel}>
        Cancel
      </Button>
    </form>
  );
}

export function ExpenseTable({
  projectId,
  expenses,
  total,
  canManage,
}: {
  projectId: string;
  expenses: ExpenseRow[];
  total: number;
  canManage: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const columns = canManage ? 6 : 5;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2.5 font-medium">Date</th>
            <th className="px-4 py-2.5 font-medium">Title</th>
            <th className="px-4 py-2.5 font-medium">Category</th>
            <th className="px-4 py-2.5 text-right font-medium">Amount</th>
            <th className="px-4 py-2.5 font-medium">Recorded by</th>
            {canManage ? (
              <th className="px-4 py-2.5 text-right font-medium">
                <span className="sr-only">Actions</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {expenses.map((e) =>
            editingId === e.id ? (
              <EditRow key={e.id} projectId={projectId} expense={e} onDone={() => setEditingId(null)} />
            ) : (
              <tr key={e.id} className="border-t border-slate-100">
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(e.spentOn)}</td>
                <td className="px-4 py-3 text-slate-900">{e.title}</td>
                <td className="px-4 py-3">
                  <Badge>{humanize(e.category)}</Badge>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-900">{formatINR(e.amount)}</td>
                <td className="px-4 py-3 text-slate-600">{e.recordedBy}</td>
                {canManage ? (
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {deletingId === e.id ? (
                      <DeleteControl projectId={projectId} id={e.id} onCancel={() => setDeletingId(null)} />
                    ) : (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Edit ${e.title}`}
                          onClick={() => {
                            setEditingId(e.id);
                            setDeletingId(null);
                          }}
                        >
                          <Pencil className="size-4" aria-hidden />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Delete ${e.title}`}
                          onClick={() => {
                            setDeletingId(e.id);
                            setEditingId(null);
                          }}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      </div>
                    )}
                  </td>
                ) : null}
              </tr>
            ),
          )}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-200 font-semibold text-slate-900">
            <td className="px-4 py-3" colSpan={3}>
              Total
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatINR(total)}</td>
            <td colSpan={columns - 4} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
