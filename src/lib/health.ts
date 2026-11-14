/**
 * Project health score — the core idea of ProjectPulse.
 *
 * Pure function (no database access), so it can be used anywhere: dashboard,
 * project overview, reports. Load the numbers with `getPortfolioHealth()` in
 * src/lib/portfolio.ts, or build a HealthInput yourself.
 *
 * The score starts at 100 and loses points for each warning sign. Every lost point
 * is explained in `factors`, so the UI can always say *why* a project is at risk.
 */

export type HealthLevel =
  | "ON_TRACK"
  | "AT_RISK"
  | "OFF_TRACK"
  | "NOT_STARTED" // project status PLANNING
  | "ON_HOLD"
  | "COMPLETED"
  | "CANCELLED";

export type HealthInput = {
  status: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
  startDate: Date;
  endDate: Date;
  budget: number; // whole ₹
  spent: number; // whole ₹
  tasksTotal: number;
  tasksDone: number;
  tasksOverdue: number; // not DONE and due before today
  milestonesOverdue: number; // PENDING and due before today
  recentBlockers: number; // updates with blockers in the last 7 days
  lastUpdateAt: Date | null;
  now?: Date;
};

export type HealthFactor = {
  label: string; // short, e.g. "Behind schedule"
  detail: string; // one sentence with the numbers
  impact: number; // points lost (positive number)
};

export type HealthResult = {
  /** 0–100, or null when the project isn't running (planning, completed, cancelled). */
  score: number | null;
  level: HealthLevel;
  /** % of tasks done. */
  progressPct: number;
  /** % of the planned schedule that has elapsed. */
  expectedPct: number;
  /** % of budget spent, or null when there is no budget. */
  budgetUsedPct: number | null;
  /** Reasons the score dropped, biggest first. */
  factors: HealthFactor[];
};

const DAY = 86_400_000;

// Tuning knobs, kept together so they're easy to explain in the project report.
export const HEALTH_THRESHOLDS = {
  onTrack: 75, // score ≥ 75 → On track
  atRisk: 50, // score ≥ 50 → At risk, below → Off track
  scheduleGrace: 10, // % points behind schedule tolerated before penalising
  budgetGrace: 15, // % points that spend may run ahead of progress
  staleDays: 14, // no progress update for this long → penalty
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);

export function computeHealth(input: HealthInput): HealthResult {
  const now = input.now ?? new Date();
  const start = input.startDate.getTime();
  const end = input.endDate.getTime();

  const progressPct = Math.round(pct(input.tasksDone, input.tasksTotal));
  const expectedPct = Math.round(clamp(pct(now.getTime() - start, end - start), 0, 100));
  const budgetUsedPct = input.budget > 0 ? Math.round(pct(input.spent, input.budget)) : null;
  const base = { progressPct, expectedPct, budgetUsedPct };

  if (input.status === "PLANNING") return { ...base, score: null, level: "NOT_STARTED", factors: [] };
  if (input.status === "COMPLETED") return { ...base, score: null, level: "COMPLETED", factors: [] };
  if (input.status === "CANCELLED") return { ...base, score: null, level: "CANCELLED", factors: [] };

  const factors: HealthFactor[] = [];
  const add = (label: string, detail: string, impact: number) => {
    const rounded = Math.round(impact);
    if (rounded > 0) factors.push({ label, detail, impact: rounded });
  };

  // 1. Schedule: is work keeping up with the calendar?
  if (input.tasksTotal === 0) {
    if (expectedPct > 10) add("No tasks planned", "The project is running but has no tasks to track.", 10);
  } else {
    const gap = expectedPct - progressPct;
    if (gap > HEALTH_THRESHOLDS.scheduleGrace) {
      add(
        "Behind schedule",
        `${progressPct}% of tasks done, but ${expectedPct}% of the time has passed.`,
        Math.min(35, (gap - HEALTH_THRESHOLDS.scheduleGrace) * 0.8),
      );
    }
  }
  if (now.getTime() > end && progressPct < 100) {
    const daysLate = Math.ceil((now.getTime() - end) / DAY);
    add("Past end date", `Planned to finish ${daysLate} day${daysLate === 1 ? "" : "s"} ago.`, 15);
  }

  // 2. Overdue tasks, relative to the work still open.
  const open = input.tasksTotal - input.tasksDone;
  if (input.tasksOverdue > 0 && open > 0) {
    add(
      "Overdue tasks",
      `${input.tasksOverdue} of ${open} open task${open === 1 ? " is" : "s are"} past due.`,
      Math.max(5, Math.min(25, pct(input.tasksOverdue, open) * 0.4)),
    );
  }

  // 3. Budget: overspent, or spending faster than work is getting done.
  if (budgetUsedPct !== null) {
    if (budgetUsedPct > 100) {
      add("Over budget", `${budgetUsedPct}% of the budget is spent.`, 20 + Math.min(10, (budgetUsedPct - 100) / 2));
    } else {
      const ahead = budgetUsedPct - progressPct;
      if (ahead > HEALTH_THRESHOLDS.budgetGrace) {
        add(
          "Spending ahead of progress",
          `${budgetUsedPct}% of the budget is spent for ${progressPct}% of the work.`,
          Math.min(15, 5 + (ahead - HEALTH_THRESHOLDS.budgetGrace) * 0.5),
        );
      }
    }
  }

  // 4. Missed milestones.
  if (input.milestonesOverdue > 0) {
    add(
      "Missed milestones",
      `${input.milestonesOverdue} milestone${input.milestonesOverdue === 1 ? " is" : "s are"} past due.`,
      Math.min(16, input.milestonesOverdue * 8),
    );
  }

  // 5. Blockers the team reported this week.
  if (input.recentBlockers > 0) {
    add(
      "Blockers reported",
      `${input.recentBlockers} update${input.recentBlockers === 1 ? "" : "s"} this week mention${input.recentBlockers === 1 ? "s" : ""} a blocker.`,
      Math.min(10, input.recentBlockers * 5),
    );
  }

  // 6. Silence: nobody has posted progress for a while.
  const sinceStartDays = (now.getTime() - start) / DAY;
  const sinceUpdateDays = input.lastUpdateAt ? (now.getTime() - input.lastUpdateAt.getTime()) / DAY : null;
  if (
    sinceStartDays > HEALTH_THRESHOLDS.staleDays &&
    (sinceUpdateDays === null || sinceUpdateDays > HEALTH_THRESHOLDS.staleDays)
  ) {
    add(
      "No recent updates",
      sinceUpdateDays === null
        ? "No progress update has been posted yet."
        : `Last progress update was ${Math.floor(sinceUpdateDays)} days ago.`,
      5,
    );
  }

  factors.sort((a, b) => b.impact - a.impact);
  const score = clamp(100 - factors.reduce((sum, f) => sum + f.impact, 0), 0, 100);

  let level: HealthLevel =
    score >= HEALTH_THRESHOLDS.onTrack ? "ON_TRACK" : score >= HEALTH_THRESHOLDS.atRisk ? "AT_RISK" : "OFF_TRACK";
  if (input.status === "ON_HOLD") level = "ON_HOLD";

  return { ...base, score, level, factors };
}
