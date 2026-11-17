"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notifications";
import { getProjectAccess } from "@/lib/permissions";
import { formatINR } from "@/lib/utils";
import { fromZodError, type ActionState } from "@/lib/action-state";

const categories = ["LABOUR", "MATERIAL", "EQUIPMENT", "SOFTWARE", "TRAVEL", "OTHER"] as const;
const expenseSchema = z.object({
  projectId: z.string().min(1),
  expenseId: z.string().optional(),
  title: z.string().trim().min(2, "Title must be at least 2 characters.").max(120, "Title must be 120 characters or fewer."),
  amount: z.coerce.number().int("Enter a whole-rupee amount.").min(1, "Amount must be at least ₹1.").max(10_000_000, "Amount cannot exceed ₹1,00,00,000."),
  category: z.enum(categories),
  spentOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.").refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return false;
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date < tomorrow;
  }, "Date cannot be in the future."),
});

async function notifyBudgetThresholds({
  projectId,
  projectName,
  managerId,
  budget,
  before,
  after,
  actorId,
}: {
  projectId: string;
  projectName: string;
  managerId: string;
  budget: number;
  before: number;
  after: number;
  actorId: string;
}) {
  if (budget <= 0) return;
  const thresholds = [
    { percent: 80, title: "Budget 80% used" },
    { percent: 100, title: "Budget exceeded" },
  ];
  const crossed = thresholds.filter(({ percent }) => before / budget * 100 < percent && after / budget * 100 >= percent);
  if (crossed.length === 0) return;

  const admins = await db.user.findMany({
    where: { role: "ADMIN", isActive: true },
    select: { id: true },
  });
  const userIds = [managerId, ...admins.map((admin) => admin.id)];
  const usedPercent = Math.round((after / budget) * 100);
  for (const threshold of crossed) {
    await notify({
      userIds,
      type: "BUDGET_ALERT",
      title: threshold.title,
      message: `${projectName} has used ${usedPercent}% of its ${formatINR(budget)} budget.`,
      link: `/projects/${projectId}/budget`,
      excludeUserId: actorId,
    });
  }
}

async function revalidateExpensePages(projectId: string) {
  revalidatePath(`/projects/${projectId}/budget`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath(`/reports/${projectId}/print`);
}

export async function addExpense(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = expenseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const access = await getProjectAccess(user, parsed.data.projectId, { manage: true });

  const before = await db.expense.aggregate({
    where: { projectId: access.project.id },
    _sum: { amount: true },
  });
  const expense = await db.expense.create({
    data: {
      projectId: access.project.id,
      title: parsed.data.title,
      amount: parsed.data.amount,
      category: parsed.data.category,
      spentOn: new Date(`${parsed.data.spentOn}T00:00:00`),
      recordedById: user.id,
    },
  });
  const after = await db.expense.aggregate({
    where: { projectId: access.project.id },
    _sum: { amount: true },
  });

  await logActivity({
    actorId: user.id,
    projectId: access.project.id,
    action: "expense.added",
    entityType: "Expense",
    entityId: expense.id,
    details: { title: expense.title, amount: expense.amount },
  });
  await notifyBudgetThresholds({
    projectId: access.project.id,
    projectName: access.project.name,
    managerId: access.project.managerId,
    budget: (await db.project.findUniqueOrThrow({ where: { id: access.project.id }, select: { budget: true } })).budget,
    before: before._sum.amount ?? 0,
    after: after._sum.amount ?? 0,
    actorId: user.id,
  });

  await revalidateExpensePages(access.project.id);
  return { success: "Expense added." };
}

export async function updateExpense(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = expenseSchema.extend({ expenseId: z.string().min(1) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const access = await getProjectAccess(user, parsed.data.projectId, { manage: true });
  const expenseWhere = { id: parsed.data.expenseId, projectId: access.project.id };
  const existing = await db.expense.findFirst({ where: expenseWhere });
  if (!existing) return { error: "Expense not found." };
  const before = await db.expense.aggregate({
    where: { projectId: access.project.id },
    _sum: { amount: true },
  });
  const expense = await db.expense.update({
    where: expenseWhere,
    data: {
      title: parsed.data.title,
      amount: parsed.data.amount,
      category: parsed.data.category,
      spentOn: new Date(`${parsed.data.spentOn}T00:00:00`),
    },
  });
  const after = await db.expense.aggregate({
    where: { projectId: access.project.id },
    _sum: { amount: true },
  });

  await logActivity({
    actorId: user.id,
    projectId: access.project.id,
    action: "expense.updated",
    entityType: "Expense",
    entityId: expense.id,
    details: { title: expense.title, amount: expense.amount },
  });
  const project = await db.project.findUniqueOrThrow({ where: { id: access.project.id }, select: { budget: true } });
  await notifyBudgetThresholds({
    projectId: access.project.id,
    projectName: access.project.name,
    managerId: access.project.managerId,
    budget: project.budget,
    before: before._sum.amount ?? 0,
    after: after._sum.amount ?? 0,
    actorId: user.id,
  });

  await revalidateExpensePages(access.project.id);
  return { success: "Expense updated." };
}

const deleteExpenseSchema = z.object({
  projectId: z.string().min(1),
  expenseId: z.string().min(1),
});

export async function deleteExpense(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = deleteExpenseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const access = await getProjectAccess(user, parsed.data.projectId, { manage: true });
  const where = { id: parsed.data.expenseId, projectId: access.project.id };
  const expense = await db.expense.findFirst({ where });
  if (!expense) return { error: "Expense not found." };

  await db.expense.delete({ where });
  await logActivity({
    actorId: user.id,
    projectId: access.project.id,
    action: "expense.deleted",
    entityType: "Expense",
    entityId: expense.id,
    details: { title: expense.title, amount: expense.amount },
  });
  await revalidateExpensePages(access.project.id);
  return { success: "Expense deleted." };
}
