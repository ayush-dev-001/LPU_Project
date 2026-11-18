export type BudgetAlertDecision = {
  title: "Budget 80% used" | "Budget exceeded";
  percentUsed: number;
};

export function getBudgetAlertDecision(input: {
  budget: number;
  before: number;
  after: number;
}): BudgetAlertDecision | null {
  if (input.budget <= 0) return null;

  const beforePct = (input.before / input.budget) * 100;
  const afterPct = (input.after / input.budget) * 100;
  const crossed = (threshold: number) => beforePct < threshold && afterPct >= threshold;

  if (crossed(100)) return { title: "Budget exceeded", percentUsed: Math.round(afterPct) };
  if (crossed(80)) return { title: "Budget 80% used", percentUsed: Math.round(afterPct) };
  return null;
}
