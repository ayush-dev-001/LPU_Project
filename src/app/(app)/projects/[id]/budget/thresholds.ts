export type BudgetThreshold = { percent: 80 | 100; title: "Budget 80% used" | "Budget exceeded" };

const THRESHOLDS: BudgetThreshold[] = [
  { percent: 80, title: "Budget 80% used" },
  { percent: 100, title: "Budget exceeded" },
];

export function crossedBudgetThresholds(budget: number, before: number, after: number) {
  if (budget <= 0 || after <= before) return [];
  return THRESHOLDS.filter(({ percent }) => before / budget * 100 < percent && after / budget * 100 >= percent);
}
