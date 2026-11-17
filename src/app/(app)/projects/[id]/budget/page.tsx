import { Wallet } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/page";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProjectAccess } from "@/lib/permissions";
import { cn, formatINR, humanize } from "@/lib/utils";
import { CategoryChart, CumulativeChart, type CumulativeDatum } from "./budget-charts";
import { AddExpense, ExpenseTable } from "./expense-form";

const monthFmt = new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });

/** Running total per calendar month, from the first expense to the last, months without spend included. */
function cumulativeByMonth(expenses: { amount: number; spentOn: Date }[]): CumulativeDatum[] {
  if (expenses.length === 0) return [];
  const perMonth = new Map<string, number>();
  for (const e of expenses) {
    const key = e.spentOn.toISOString().slice(0, 7);
    perMonth.set(key, (perMonth.get(key) ?? 0) + e.amount);
  }
  const keys = [...perMonth.keys()].sort();
  const first = keys[0]!;
  const last = keys.at(-1)!;

  const out: CumulativeDatum[] = [];
  let running = 0;
  const cursor = new Date(`${first}-01T00:00:00Z`);
  while (cursor.toISOString().slice(0, 7) <= last) {
    const key = cursor.toISOString().slice(0, 7);
    running += perMonth.get(key) ?? 0;
    out.push({ month: monthFmt.format(cursor), total: running });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return out;
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn("mt-1 text-xl font-semibold tabular-nums text-slate-900", className)}>{value}</p>
    </Card>
  );
}

export default async function BudgetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const access = await getProjectAccess(user, id);
  const projectId = access.project.id;

  const [project, sum, byCategory, expenses] = await Promise.all([
    db.project.findUniqueOrThrow({ where: { id: projectId }, select: { budget: true } }),
    db.expense.aggregate({ where: { projectId }, _sum: { amount: true } }),
    db.expense.groupBy({ by: ["category"], where: { projectId }, _sum: { amount: true } }),
    db.expense.findMany({
      where: { projectId },
      orderBy: [{ spentOn: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        amount: true,
        category: true,
        spentOn: true,
        recordedBy: { select: { name: true } },
      },
    }),
  ]);

  const budget = project.budget;
  const spent = sum._sum.amount ?? 0;
  const remaining = budget - spent;
  const usedPct = budget > 0 ? Math.round((spent / budget) * 100) : null;
  const usedTone =
    usedPct === null ? "" : usedPct > 100 ? "text-red-600" : usedPct >= 80 ? "text-amber-600" : "text-emerald-600";

  const categoryData = byCategory
    .map((c) => ({ label: humanize(c.category), amount: c._sum.amount ?? 0 }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const cumulative = cumulativeByMonth([...expenses].reverse());

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Budget" value={budget > 0 ? formatINR(budget) : "Not set"} />
        <Stat label="Spent" value={formatINR(spent)} />
        <Stat label="Remaining" value={formatINR(remaining)} className={remaining < 0 ? "text-red-600" : undefined} />
        <Stat label="Budget used" value={usedPct === null ? "—" : `${usedPct}%`} className={usedTone} />
      </div>

      {access.canManage ? <AddExpense projectId={projectId} /> : null}

      {expenses.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No expenses yet"
          description={access.canManage ? "Add the first expense to start tracking spend against the budget." : undefined}
        />
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Spend by category" />
              <CardBody>
                <CategoryChart data={categoryData} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Cumulative spend" description={budget > 0 ? "Dashed line marks the budget." : undefined} />
              <CardBody>
                <CumulativeChart data={cumulative} budget={budget} />
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader title="Expenses" description={`${expenses.length} recorded`} />
            <ExpenseTable
              projectId={projectId}
              canManage={access.canManage}
              total={spent}
              expenses={expenses.map((e) => ({
                id: e.id,
                title: e.title,
                amount: e.amount,
                category: e.category,
                spentOn: e.spentOn,
                recordedBy: e.recordedBy.name,
              }))}
            />
          </Card>
        </>
      )}
    </div>
  );
}
