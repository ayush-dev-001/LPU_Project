"use client";

import { useActionState } from "react";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, FormMessage, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { toDateInputValue } from "@/lib/utils";
import { addExpense, deleteExpense, updateExpense } from "./actions";

const categoryOptions = [
  ["LABOUR", "Labour"],
  ["MATERIAL", "Material"],
  ["EQUIPMENT", "Equipment"],
  ["SOFTWARE", "Software"],
  ["TRAVEL", "Travel"],
  ["OTHER", "Other"],
] as const;

export function ExpenseForm({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(addExpense, undefined);
  return (
    <>
      <Button type="button" onClick={() => setOpen((value) => !value)}>
        {open ? <X className="size-4" aria-hidden /> : <Plus className="size-4" aria-hidden />}
        {open ? "Close" : "Add expense"}
      </Button>
      {open ? (
        <Card className="mt-4">
          <CardHeader title="Add expense" description="Amounts are recorded in whole Indian rupees." />
          <CardBody>
            <form action={action} className="grid gap-4 sm:grid-cols-2">
              <FormMessage error={state?.fieldErrors ? undefined : state?.error} success={state?.success} />
              <input type="hidden" name="projectId" value={projectId} />
              <Field label="Title" htmlFor="expense-title" errors={state?.fieldErrors?.title}>
                <Input id="expense-title" name="title" minLength={2} maxLength={120} required />
              </Field>
              <Field label="Amount (₹)" htmlFor="expense-amount" errors={state?.fieldErrors?.amount}>
                <Input id="expense-amount" name="amount" type="number" min={1} max={10000000} step={1} required />
              </Field>
              <Field label="Category" htmlFor="expense-category" errors={state?.fieldErrors?.category}>
                <Select id="expense-category" name="category" defaultValue="OTHER">
                  {categoryOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </Select>
              </Field>
              <Field label="Date" htmlFor="expense-date" errors={state?.fieldErrors?.spentOn}>
                <Input id="expense-date" name="spentOn" type="date" max={toDateInputValue(new Date())} required />
              </Field>
              <div className="sm:col-span-2">
                <SubmitButton>Add expense</SubmitButton>
              </div>
            </form>
          </CardBody>
        </Card>
      ) : null}
    </>
  );
}

type ExpenseValue = {
  id: string;
  title: string;
  amount: number;
  category: (typeof categoryOptions)[number][0];
  spentOn: string;
};

export function ExpenseActions({ projectId, expense }: { projectId: string; expense: ExpenseValue }) {
  const [updateState, updateAction] = useActionState(updateExpense, undefined);
  const [deleteState, deleteAction] = useActionState(deleteExpense, undefined);
  return (
    <div className="flex items-start gap-2">
      <details className="min-w-24">
        <summary className="cursor-pointer rounded px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50">Edit</summary>
        <form action={updateAction} className="mt-2 min-w-64 space-y-3 rounded-md border border-slate-200 bg-white p-3">
          <FormMessage error={updateState?.fieldErrors ? undefined : updateState?.error} success={updateState?.success} />
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="expenseId" value={expense.id} />
          <Field label="Title" htmlFor={`title-${expense.id}`} errors={updateState?.fieldErrors?.title}>
            <Input id={`title-${expense.id}`} name="title" defaultValue={expense.title} required minLength={2} maxLength={120} />
          </Field>
          <Field label="Amount (₹)" htmlFor={`amount-${expense.id}`} errors={updateState?.fieldErrors?.amount}>
            <Input id={`amount-${expense.id}`} name="amount" type="number" defaultValue={expense.amount} min={1} max={10000000} step={1} required />
          </Field>
          <Field label="Category" htmlFor={`category-${expense.id}`} errors={updateState?.fieldErrors?.category}>
            <Select id={`category-${expense.id}`} name="category" defaultValue={expense.category}>
              {categoryOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          </Field>
          <Field label="Date" htmlFor={`spentOn-${expense.id}`} errors={updateState?.fieldErrors?.spentOn}>
            <Input id={`spentOn-${expense.id}`} name="spentOn" type="date" defaultValue={expense.spentOn} max={toDateInputValue(new Date())} required />
          </Field>
          <SubmitButton size="sm">Save changes</SubmitButton>
        </form>
      </details>
      <form
        action={deleteAction}
        onSubmit={(event) => {
          if (!window.confirm(`Delete “${expense.title}”?`)) event.preventDefault();
        }}
      >
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="expenseId" value={expense.id} />
        <SubmitButton variant="ghost" size="sm" className="text-red-700 hover:bg-red-50" aria-label={`Delete ${expense.title}`}>
          Delete
        </SubmitButton>
        {deleteState?.error ? <span role="alert" className="block text-xs text-red-700">{deleteState.error}</span> : null}
      </form>
    </div>
  );
}
