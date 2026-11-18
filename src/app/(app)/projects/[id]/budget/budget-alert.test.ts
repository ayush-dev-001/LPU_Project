import { describe, expect, it } from "vitest";
import { getBudgetAlertDecision } from "./budget-alert";

describe("getBudgetAlertDecision", () => {
  it("alerts when spending reaches exactly 80% from below", () => {
    expect(getBudgetAlertDecision({ budget: 100_000, before: 79_999, after: 80_000 })).toEqual({
      title: "Budget 80% used",
      percentUsed: 80,
    });
  });

  it("does not repeat an alert when spending was already at the threshold", () => {
    expect(getBudgetAlertDecision({ budget: 100_000, before: 80_000, after: 90_000 })).toBeNull();
    expect(getBudgetAlertDecision({ budget: 100_000, before: 100_000, after: 110_000 })).toBeNull();
  });

  it("alerts when spending reaches 100% and prefers exceeded when both thresholds are crossed", () => {
    expect(getBudgetAlertDecision({ budget: 100_000, before: 99_999, after: 100_000 })).toEqual({
      title: "Budget exceeded",
      percentUsed: 100,
    });
    expect(getBudgetAlertDecision({ budget: 100_000, before: 79_000, after: 120_000 })).toEqual({
      title: "Budget exceeded",
      percentUsed: 120,
    });
  });

  it("does not alert for a zero or negative budget", () => {
    expect(getBudgetAlertDecision({ budget: 0, before: 0, after: 1 })).toBeNull();
    expect(getBudgetAlertDecision({ budget: -1, before: 0, after: 1 })).toBeNull();
  });
});
