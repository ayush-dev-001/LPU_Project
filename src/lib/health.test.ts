import { describe, expect, it } from "vitest";
import { computeHealth, type HealthInput } from "./health";

const NOW = new Date("2026-06-01T12:00:00Z");
const day = 86_400_000;
const daysAgo = (n: number) => new Date(NOW.getTime() - n * day);
const daysAhead = (n: number) => new Date(NOW.getTime() + n * day);

/** A healthy project halfway through its schedule; override what each test needs. */
function input(overrides: Partial<HealthInput> = {}): HealthInput {
  return {
    status: "ACTIVE",
    startDate: daysAgo(50),
    endDate: daysAhead(50),
    budget: 100_000,
    spent: 50_000,
    tasksTotal: 10,
    tasksDone: 5,
    tasksOverdue: 0,
    milestonesOverdue: 0,
    recentBlockers: 0,
    lastUpdateAt: daysAgo(2),
    now: NOW,
    ...overrides,
  };
}

const labels = (r: ReturnType<typeof computeHealth>) => r.factors.map((f) => f.label);

describe("computeHealth", () => {
  it("scores a project that is exactly on schedule and on budget as 100 / on track", () => {
    const r = computeHealth(input());
    expect(r.score).toBe(100);
    expect(r.level).toBe("ON_TRACK");
    expect(r.factors).toEqual([]);
    expect(r.progressPct).toBe(50);
    expect(r.expectedPct).toBe(50);
    expect(r.budgetUsedPct).toBe(50);
  });

  it("does not score projects that are not running", () => {
    for (const [status, level] of [
      ["PLANNING", "NOT_STARTED"],
      ["COMPLETED", "COMPLETED"],
      ["CANCELLED", "CANCELLED"],
    ] as const) {
      const r = computeHealth(input({ status }));
      expect(r.score).toBeNull();
      expect(r.level).toBe(level);
    }
  });

  it("tolerates being up to 10 points behind schedule", () => {
    // 40% done at 50% of the time → 10-point gap, within grace
    expect(computeHealth(input({ tasksDone: 4 })).score).toBe(100);
  });

  it("penalises falling behind schedule, capped at 35", () => {
    // 20-point gap; spend kept in line with progress so only the schedule counts
    const slightly = computeHealth(input({ tasksDone: 3, spent: 30_000 }));
    expect(labels(slightly)).toContain("Behind schedule");
    expect(slightly.score).toBe(92);

    const badly = computeHealth(input({ tasksDone: 0, startDate: daysAgo(99), endDate: daysAhead(1) }));
    expect(badly.factors.find((f) => f.label === "Behind schedule")?.impact).toBe(35);
  });

  it("adds a penalty once the planned end date has passed with work left", () => {
    const r = computeHealth(input({ startDate: daysAgo(100), endDate: daysAgo(3), tasksDone: 9 }));
    expect(labels(r)).toContain("Past end date");
    expect(r.factors.find((f) => f.label === "Past end date")?.detail).toMatch(/3 days ago/);
  });

  it("penalises overdue tasks relative to open work, at least 5 points", () => {
    const one = computeHealth(input({ tasksOverdue: 1 })); // 1 of 5 open = 20% → 8
    expect(one.factors.find((f) => f.label === "Overdue tasks")?.impact).toBe(8);

    const tiny = computeHealth(input({ tasksTotal: 100, tasksDone: 50, tasksOverdue: 1 })); // 2% → floor 5
    expect(tiny.factors.find((f) => f.label === "Overdue tasks")?.impact).toBe(5);
  });

  it("penalises going over budget harder than spending ahead of progress", () => {
    const over = computeHealth(input({ spent: 120_000 }));
    expect(over.factors.find((f) => f.label === "Over budget")?.impact).toBe(30);

    const ahead = computeHealth(input({ spent: 80_000 })); // 80% spent for 50% done → 30 ahead
    expect(ahead.factors.find((f) => f.label === "Spending ahead of progress")?.impact).toBe(13);

    const noBudget = computeHealth(input({ budget: 0, spent: 5_000 }));
    expect(noBudget.budgetUsedPct).toBeNull();
    expect(noBudget.score).toBe(100);
  });

  it("penalises missed milestones, blockers and silence", () => {
    const r = computeHealth(input({ milestonesOverdue: 3, recentBlockers: 5, lastUpdateAt: null }));
    expect(r.factors.find((f) => f.label === "Missed milestones")?.impact).toBe(16);
    expect(r.factors.find((f) => f.label === "Blockers reported")?.impact).toBe(10);
    expect(r.factors.find((f) => f.label === "No recent updates")?.impact).toBe(5);
  });

  it("does not call a brand-new project stale", () => {
    const r = computeHealth(input({ startDate: daysAgo(5), endDate: daysAhead(95), tasksDone: 0, lastUpdateAt: null }));
    expect(labels(r)).not.toContain("No recent updates");
  });

  it("orders factors by impact, never goes below 0, and maps levels by threshold", () => {
    const r = computeHealth(
      input({
        startDate: daysAgo(100),
        endDate: daysAgo(10),
        tasksDone: 1,
        tasksOverdue: 9,
        spent: 200_000,
        milestonesOverdue: 4,
        recentBlockers: 4,
        lastUpdateAt: daysAgo(30),
      }),
    );
    expect(r.score).toBe(0);
    expect(r.level).toBe("OFF_TRACK");
    const impacts = r.factors.map((f) => f.impact);
    expect(impacts).toEqual([...impacts].sort((a, b) => b - a));

    expect(computeHealth(input({ tasksDone: 0, spent: 0 })).level).toBe("AT_RISK"); // 50 gap → 32 → 68
  });

  it("keeps the score but labels on-hold projects as on hold", () => {
    const r = computeHealth(input({ status: "ON_HOLD", tasksDone: 0 }));
    expect(r.level).toBe("ON_HOLD");
    expect(r.score).toBeLessThan(100);
  });
});
