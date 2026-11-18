"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getProjectAccess } from "@/lib/permissions";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notifications";
import { fromZodError, type ActionState } from "@/lib/action-state";
import { formatINR } from "@/lib/utils";
import { crossedBudgetThresholds } from "./thresholds";
import { EXPENSE_CATEGORIES } from "./categories";

/**
 * Today's date as YYYY-MM-DD in India time, whatever timezone the server runs in
 * (hosting is usually UTC, which is still "yesterday" before 5:30 am IST).
 */
function todayLocal() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

const expenseFields = {
  projectId: z.string().min(1),
  title: z.string().trim().min(2, "Title is too short.").max(120, "Keep the title under 120 characters."),
  amount: z.coerce
    .number({ error: "Enter an amount in rupees." })
    .int("Use whole rupees, no paise.")
    .min(1, "Amount must be at least ₹1.")
    .max(10_000_000, "Amount can be at most ₹1,00,00,000."),
  category: z.enum(EXPENSE_CATEGORIES, { error: "Pick a category." }),
  spentOn: z.iso
    .date({ error: "Pick a date." })
    .refine((d) => d <= todayLocal(), "The date can't be in the future."),
};

const addSchema = z.object(expenseFields);
const updateSchema = z.object({ ...expenseFields, id: z.string().min(1) });
const deleteSchema = z.object({ id: z.string().min(1), projectId: z.string().min(1) });

async function totalSpent(projectId: string) {
  const sum = await db.expense.aggregate({ where: { projectId }, _sum: { amount: true } });
  return sum._sum.amount ?? 0;
}

/**
 * Notify the manager and all active admins when spending crosses 80% or 100% of the budget.
 * Only fires on the crossing itself (below the line before, on or above it after).
 */
async function budgetAlert(input: {
  project: { id: string; name: string; managerId: string };
  actorId: string;
  before: number;
  after: number;
}) {
  const project = await db.project.findUnique({ where: { id: input.project.id }, select: { budget: true } });
  const budget = project?.budget ?? 0;
  if (budget <= 0) return;

  const pctAfter = (input.after / budget) * 100;
  const thresholds = crossedBudgetThresholds(budget, input.before, input.after);
  if (thresholds.length === 0) return;

  const admins = await db.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });
  for (const { title } of thresholds) {
    await notify({
      userIds: [input.project.managerId, ...admins.map((a) => a.id)],
      type: "BUDGET_ALERT",
      title,
      message: `${input.project.name} has used ${Math.round(pctAfter)}% of its ${formatINR(budget)} budget.`,
      link: `/projects/${input.project.id}/budget`,
      excludeUserId: input.actorId,
    });
  }
}

function revalidateBudget(projectId: string) {
  revalidatePath(`/projects/${projectId}/budget`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
}

export async function addExpense(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = addSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const access = await getProjectAccess(user, parsed.data.projectId, { manage: true });
  const { title, amount, category, spentOn } = parsed.data;

  const before = await totalSpent(access.project.id);
  const expense = await db.expense.create({
    data: { projectId: access.project.id, title, amount, category, spentOn: new Date(spentOn), recordedById: user.id },
  });

  await logActivity({
    actorId: user.id,
    projectId: access.project.id,
    action: "expense.added",
    entityType: "Expense",
    entityId: expense.id,
    details: { title, amount },
  });
  await budgetAlert({ project: access.project, actorId: user.id, before, after: before + amount });

  revalidateBudget(access.project.id);
  return { success: "Expense added." };
}

export async function updateExpense(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const access = await getProjectAccess(user, parsed.data.projectId, { manage: true });
  const { id, title, amount, category, spentOn } = parsed.data;

  const existing = await db.expense.findFirst({
    where: { id, projectId: access.project.id },
    select: { id: true, amount: true },
  });
  if (!existing) return { error: "This expense no longer exists." };

  const before = await totalSpent(access.project.id);
  await db.expense.updateMany({
    where: { id: existing.id, projectId: access.project.id },
    data: { title, amount, category, spentOn: new Date(spentOn) },
  });

  await logActivity({
    actorId: user.id,
    projectId: access.project.id,
    action: "expense.updated",
    entityType: "Expense",
    entityId: existing.id,
    details: { title, amount },
  });
  await budgetAlert({ project: access.project, actorId: user.id, before, after: before - existing.amount + amount });

  revalidateBudget(access.project.id);
  return { success: "Expense updated." };
}

export async function deleteExpense(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = deleteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Something went wrong. Refresh and try again." };

  const access = await getProjectAccess(user, parsed.data.projectId, { manage: true });
  const existing = await db.expense.findFirst({
    where: { id: parsed.data.id, projectId: access.project.id },
    select: { id: true, title: true, amount: true },
  });
  if (!existing) return { error: "This expense no longer exists." };

  await db.expense.deleteMany({ where: { id: existing.id, projectId: access.project.id } });

  await logActivity({
    actorId: user.id,
    projectId: access.project.id,
    action: "expense.deleted",
    entityType: "Expense",
    entityId: existing.id,
    details: { title: existing.title, amount: existing.amount },
  });

  revalidateBudget(access.project.id);
  return { success: "Expense deleted." };
}
