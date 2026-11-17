import { Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProjectAccess } from "@/lib/permissions";
import { formatDate, formatINR, humanize } from "@/lib/utils";
import { BudgetCharts } from "./budget-charts";
import { ExpenseActions, ExpenseForm } from "./expense-form";

const monthFormat = new Intl.DateTimeFormat("en-IN", { month: "short", year: "2-digit" });

export default async function ProjectBudgetPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);
  const access = await getProjectAccess(user, id);
  const projectId = access.project.id;
  const where = { projectId };
  const [project, sum, categories, dailySpends, expenses] = await Promise.all([
    db.project.findUniqueOrThrow({ where: { id: projectId }, select: { budget: true } }),
    db.expense.aggregate({ where, _sum: { amount: true } }),
    db.expense.groupBy({ by: ["category"], where, _sum: { amount: true }, orderBy: { category: "asc" } }),
    db.expense.groupBy({ by: ["spentOn"], where, _sum: { amount: true }, orderBy: { spentOn: "asc" } }),
    db.expense.findMany({
      where,
      include: { recordedBy: { select: { name: true } } },
      orderBy: [{ spentOn: "desc" }, { createdAt: "desc" }],
    }),
  ]);
  const spent = sum._sum.amount ?? 0;
  const remaining = project.budget - spent;
  const percentUsed = project.budget > 0 ? (spent / project.budget) * 100 : null;
  const usageTone = percentUsed === null || percentUsed < 80
    ? "text-emerald-700"
    : percentUsed <= 100
      ? "text-amber-700"
      : "text-red-700";

  const byMonth = new Map<string, { month: string; spend: number }>();
  for (const row of dailySpends) {
    const key = `${row.spentOn.getFullYear()}-${row.spentOn.getMonth()}`;
    const existing = byMonth.get(key);
    if (existing) existing.spend += row._sum.amount ?? 0;
    else byMonth.set(key, { month: monthFormat.format(row.spentOn), spend: row._sum.amount ?? 0 });
  }
  let runningSpend = 0;
  const cumulative = [...byMonth.values()].map((row) => {
    runningSpend += row.spend;
    return { month: row.month, spend: runningSpend };
  });
  const categoryData = categories
    .map((row) => ({ category: humanize(row.category), amount: row._sum.amount ?? 0 }))
    .filter((row) => row.amount > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budget"
        description="Track planned budget against recorded project expenses."
      />
      {access.canManage ? <ExpenseForm projectId={projectId} /> : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Budget" value={formatINR(project.budget)} />
        <StatCard label="Spent" value={formatINR(spent)} />
        <StatCard label="Remaining" value={formatINR(remaining)} valueClass={remaining < 0 ? "text-red-700" : undefined} />
        <StatCard
          label="% used"
          value={percentUsed === null ? "—" : `${percentUsed.toFixed(1)}%`}
          valueClass={usageTone}
        />
      </div>
      <BudgetCharts categories={categoryData} cumulative={cumulative} budget={project.budget} />
      <Card>
        <CardHeader title="Expenses" description={`${expenses.length} recorded item${expenses.length === 1 ? "" : "s"}`} />
        <CardBody className="p-0">
          {expenses.length === 0 ? (
            <div className="p-5">
              <EmptyState icon={Wallet} title="No expenses yet" description="Recorded expenses will appear here." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Recorded by</th>
                    {access.canManage ? <th className="px-4 py-3">Actions</th> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.map((expense) => (
                    <tr key={expense.id}>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(expense.spentOn)}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{expense.title}</td>
                      <td className="px-4 py-3"><Badge>{humanize(expense.category)}</Badge></td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">{formatINR(expense.amount)}</td>
                      <td className="px-4 py-3 text-slate-600">{expense.recordedBy.name}</td>
                      {access.canManage ? (
                        <td className="px-4 py-3">
                          <ExpenseActions
                            projectId={projectId}
                            expense={{
                              id: expense.id,
                              title: expense.title,
                              amount: expense.amount,
                              category: expense.category,
                              spentOn: expense.spentOn.toISOString().slice(0, 10),
                            }}
                          />
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                  <tr>
                    <th colSpan={3} className="px-4 py-3 text-right font-semibold text-slate-800">Total</th>
                    <th className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">{formatINR(spent)}</th>
                    <td colSpan={access.canManage ? 2 : 1} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function StatCard({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <Card>
      <CardBody>
        <p className="text-sm text-slate-500">{label}</p>
        <p className={`mt-2 text-xl font-semibold tabular-nums ${valueClass ?? "text-slate-900"}`}>{value}</p>
      </CardBody>
    </Card>
  );
}
