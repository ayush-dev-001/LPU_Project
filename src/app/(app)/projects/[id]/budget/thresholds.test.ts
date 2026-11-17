import { describe, expect, it } from "vitest";
import { crossedBudgetThresholds } from "./thresholds";

describe("crossedBudgetThresholds", () => {
  it("alerts only when an expense total first reaches a threshold", () => {
    expect(crossedBudgetThresholds(1000, 799, 800)).toEqual([
      { percent: 80, title: "Budget 80% used" },
    ]);
    expect(crossedBudgetThresholds(1000, 999, 1000)).toEqual([
      { percent: 100, title: "Budget exceeded" },
    ]);
    expect(crossedBudgetThresholds(1000, 799, 1001)).toEqual([
      { percent: 80, title: "Budget 80% used" },
      { percent: 100, title: "Budget exceeded" },
    ]);
  });

  it("does not repeat an alert after crossing, or alert on a decrease", () => {
    expect(crossedBudgetThresholds(1000, 1000, 1200)).toEqual([]);
    expect(crossedBudgetThresholds(1000, 900, 700)).toEqual([]);
  });

  it("skips percentage alerts when a project has no budget", () => {
    expect(crossedBudgetThresholds(0, 0, 100)).toEqual([]);
  });
});
