"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BellRing,
  GanttChart,
  LayoutDashboard,
  ListChecks,
  MessageSquareWarning,
  Plus,
  Search,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * The search box and dashboard preview on the landing page.
 * Everything runs in the browser on sample data: nothing is sent anywhere,
 * so a visitor can click around before they have an account.
 */

type ProjectCode = "PRJ-001" | "PRJ-002";
type View = "overview" | "tasks" | "timeline" | "budget";
type Alert = "deadlines" | "budget" | "blockers";
type Tab = "views" | "filters";

type Sample = {
  name: string;
  status: string;
  score: number;
  /** Health score per day for the last 24 days. */
  health: number[];
  /** Tasks closed per day for the last 24 days. */
  tasksDone: number[];
  /** Updates posted per week for the last 24 weeks of the project. */
  progress: number[];
  /** Money spent per day this month, in thousands of rupees. */
  spend: number[];
  tasks: { done: number; total: number; dueThisWeek: number; next: string };
  timeline: { next: string; daysLeft: number; milestones: number; timeUsed: number };
  budget: { spent: string; percent: number; lastEntry: string };
  alerts: Record<Alert, { title: string; detail: string }>;
};

const SAMPLE: Record<ProjectCode, Sample> = {
  "PRJ-001": {
    name: "Website redesign",
    status: "on track",
    score: 92,
    health: [70, 74, 78, 76, 80, 84, 82, 79, 77, 76, 78, 81, 85, 88, 90, 87, 89, 92, 90, 86, 85, 88, 91, 92],
    tasksDone: [1, 2, 3, 2, 3, 4, 2, 1, 1, 0, 1, 2, 4, 5, 6, 4, 5, 7, 5, 3, 2, 4, 6, 4],
    progress: [2, 3, 3, 4, 5, 4, 6, 5, 6, 7, 6, 8, 7, 8, 9, 8, 9, 10, 9, 10, 11, 10, 11, 12],
    spend: [4, 6, 3, 8, 5, 2, 0, 7, 9, 4, 6, 3, 5, 8, 2, 6, 4, 7, 3, 5, 6, 2, 4, 3],
    tasks: { done: 18, total: 24, dueThisWeek: 4, next: "Review the API contract" },
    timeline: { next: "Beta release", daysLeft: 9, milestones: 4, timeUsed: 62 },
    budget: { spent: "₹1.2L", percent: 54, lastEntry: "Design tools · ₹6,000" },
    alerts: {
      deadlines: { title: "Due in 2 days", detail: "Rahul · API docs · Friday" },
      budget: { title: "Budget at 54%", detail: "Within plan · checked today" },
      blockers: { title: "Blocker reported", detail: "Aman · PRJ-001 · just now" },
    },
  },
  "PRJ-002": {
    name: "Mobile app",
    status: "at risk",
    score: 58,
    health: [82, 80, 78, 75, 72, 70, 71, 68, 66, 65, 63, 64, 62, 60, 61, 59, 57, 58, 56, 57, 59, 58, 57, 58],
    tasksDone: [3, 2, 2, 1, 2, 1, 0, 1, 2, 1, 0, 1, 1, 2, 1, 0, 1, 2, 1, 1, 0, 1, 2, 1],
    progress: [3, 4, 4, 5, 4, 5, 5, 4, 4, 3, 4, 3, 3, 4, 3, 3, 2, 3, 3, 2, 3, 2, 2, 3],
    spend: [9, 7, 11, 8, 12, 6, 4, 10, 13, 9, 11, 8, 12, 10, 7, 14, 9, 11, 13, 8, 10, 12, 9, 11],
    tasks: { done: 7, total: 22, dueThisWeek: 6, next: "Fix login on Android" },
    timeline: { next: "Store submission", daysLeft: 5, milestones: 3, timeUsed: 89 },
    budget: { spent: "₹2.4L", percent: 80, lastEntry: "Cloud hosting · ₹18,000" },
    alerts: {
      deadlines: { title: "Overdue by 1 day", detail: "Sneha · Push notifications" },
      budget: { title: "Budget at 80%", detail: "PRJ-002 · over the 75% warning" },
      blockers: { title: "2 open blockers", detail: "Karan · PRJ-002 · 3 hours ago" },
    },
  },
};

const VIEWS: { id: View; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "tasks", label: "Tasks", icon: ListChecks },
  { id: "timeline", label: "Timeline", icon: GanttChart },
  { id: "budget", label: "Budget", icon: Wallet },
];

const ALERTS: { id: Alert; label: string; icon: LucideIcon }[] = [
  { id: "deadlines", label: "Deadlines", icon: BellRing },
  { id: "budget", label: "Budget", icon: Wallet },
  { id: "blockers", label: "Blockers", icon: MessageSquareWarning },
];

const QUESTION = "Which of my projects need attention?";

/** What each view shows in the cards, worked out from the sample project. */
function cardsFor(view: View, p: Sample, code: ProjectCode) {
  switch (view) {
    case "overview":
      return {
        chart: { label: "Health score", value: String(p.score), title: `${code} ${p.status}`, bars: p.health, unit: "" },
        big: { value: "3", label: "roles, one app" },
        meter: { title: `${p.tasks.done} of ${p.tasks.total} tasks done`, percent: Math.round((p.tasks.done / p.tasks.total) * 100) },
      };
    case "tasks":
      return {
        chart: { label: "Tasks closed", value: String(p.tasksDone.reduce((a, b) => a + b, 0)), title: "Last 24 days", bars: p.tasksDone, unit: " tasks" },
        big: { value: String(p.tasks.dueThisWeek), label: "due this week" },
        meter: { title: `Next: ${p.tasks.next}`, percent: Math.round((p.tasks.done / p.tasks.total) * 100) },
      };
    case "timeline":
      return {
        chart: { label: "Updates per week", value: `${p.timeline.daysLeft}d`, title: `${p.timeline.next} in ${p.timeline.daysLeft} days`, bars: p.progress, unit: " updates" },
        big: { value: String(p.timeline.milestones), label: "milestones" },
        meter: { title: `${p.timeline.timeUsed}% of the time used`, percent: p.timeline.timeUsed },
      };
    case "budget":
      return {
        chart: { label: "Spent this month", value: p.budget.spent, title: p.budget.lastEntry, bars: p.spend, unit: "k ₹" },
        big: { value: `${p.budget.percent}%`, label: "of budget used" },
        meter: { title: `Budget at ${p.budget.percent}%`, percent: p.budget.percent },
      };
  }
}

export function HeroDemo() {
  const [project, setProject] = useState<ProjectCode>("PRJ-001");
  const [view, setView] = useState<View>("budget");
  const [tab, setTab] = useState<Tab>("views");
  const [alert, setAlert] = useState<Alert>("blockers");
  const [question, setQuestion] = useState("");
  const [answered, setAnswered] = useState(false);
  const [hoverBar, setHoverBar] = useState<number | null>(null);

  const p = SAMPLE[project];
  const cards = cardsFor(view, p, project);
  const peak = Math.max(...cards.chart.bars, 1);
  const shownAlert = p.alerts[alert];

  // The preview is sample data, so any question gets the same answer: the at-risk project.
  function ask(e: React.FormEvent) {
    e.preventDefault();
    setProject("PRJ-002");
    setView("overview");
    setAlert("blockers");
    setAnswered(true);
  }

  return (
    <>
      <form onSubmit={ask} className="relative mx-auto mt-8 max-w-md text-center" role="search">
        <div className="flex items-center gap-2 rounded-xl border border-[#2a2a2f] bg-[#111113] p-1.5 pl-3 focus-within:border-[#2f7cf6]">
          <Search className="size-4 shrink-0 text-slate-500" aria-hidden />
          <label htmlFor="hero-question" className="sr-only">
            Ask the preview a question
          </label>
          <input
            id="hero-question"
            value={question}
            onChange={(e) => {
              setQuestion(e.target.value);
              setAnswered(false);
            }}
            placeholder={QUESTION}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-left text-sm text-slate-900 outline-none placeholder:text-slate-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-[#2f7cf6] px-4 py-2 text-sm font-medium text-on-color transition-colors hover:bg-[#2a6fe0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f7cf6]"
          >
            Ask
          </button>
        </div>
        <p className="mt-3 min-h-5 text-sm text-slate-600" aria-live="polite">
          {answered ? (
            <>
              <span className="text-slate-900">PRJ-002 needs attention:</span> health 58, budget at 80% and 2 open
              blockers.{" "}
              <Link href="/register" className="text-[#5b9cf6] underline-offset-4 hover:underline">
                Get started
              </Link>{" "}
              to see your own.
            </>
          ) : (
            <>Press Ask, or click around the preview below. It runs on sample data.</>
          )}
        </p>
      </form>

      <div
        className="relative mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-3 rounded-t-2xl border border-b-0 border-[#232327] bg-[#0f0f11] p-3 text-left sm:grid-cols-[180px_minmax(0,1fr)] sm:p-4"
        aria-label="Interactive preview of the ProjectPulse dashboard, using sample data"
        role="region"
      >
        {/* Left list: views or filters */}
        <div className="min-w-0 rounded-xl sm:p-2">
          <div className="flex gap-4 px-1 text-xs">
            {(["views", "filters"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                aria-pressed={tab === t}
                className={cn("capitalize transition-colors", tab === t ? "text-slate-900" : "text-slate-500 hover:text-slate-700")}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === "views" ? (
            <ul className="mt-3 flex gap-1.5 overflow-x-auto text-sm sm:mt-4 sm:block sm:space-y-1.5">
              {VIEWS.map(({ id, label, icon: Icon }) => {
                const active = view === id;
                return (
                  <li key={id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => setView(id)}
                      aria-pressed={active}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors",
                        active ? "bg-[#1c1c20] text-slate-900" : "text-slate-600 hover:bg-[#17171a] hover:text-slate-800",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-6 items-center justify-center rounded-md transition-colors",
                          active ? "bg-[#2f7cf6] text-on-color" : "bg-[#1c1c20]",
                        )}
                      >
                        <Icon className="size-3.5" aria-hidden />
                      </span>
                      {label}
                    </button>
                  </li>
                );
              })}
              <li className="shrink-0">
                <Link
                  href="/register"
                  className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-slate-600 hover:bg-[#17171a] hover:text-slate-800"
                >
                  <span className="flex size-6 items-center justify-center rounded-md bg-[#1c1c20]">
                    <Plus className="size-3.5" aria-hidden />
                  </span>
                  Add view
                </Link>
              </li>
            </ul>
          ) : (
            <div className="mt-3 sm:mt-4">
              <p className="px-1 text-xs text-slate-500">Project</p>
              <ul className="mt-2 flex gap-1.5 text-sm sm:block sm:space-y-1.5">
                {(Object.keys(SAMPLE) as ProjectCode[]).map((code) => {
                  const active = project === code;
                  return (
                    <li key={code} className="shrink-0">
                      <button
                        type="button"
                        onClick={() => setProject(code)}
                        aria-pressed={active}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors",
                          active ? "bg-[#1c1c20] text-slate-900" : "text-slate-600 hover:bg-[#17171a]",
                        )}
                      >
                        <span className="text-left">
                          {code}
                          <span className="block text-xs text-slate-500">{SAMPLE[code].name}</span>
                        </span>
                        <span
                          className={cn(
                            "size-2 rounded-full",
                            SAMPLE[code].score >= 75 ? "bg-mint" : "bg-[#f0a070]",
                          )}
                          aria-label={SAMPLE[code].status}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Cards */}
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,0.8fr)_minmax(0,1.2fr)]">
          {/* Chart card */}
          <div className="rounded-2xl bg-sand p-4 text-ink">
            <div className="flex justify-between text-xs text-ink/60">
              <span>{cards.chart.label}</span>
              <span>{hoverBar === null ? "This month" : `Day ${hoverBar + 1}`}</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-3">
              <span className="truncate text-lg tracking-tight">{cards.chart.title}</span>
              <span className="text-2xl tabular-nums tracking-tight">
                {hoverBar === null ? cards.chart.value : `${cards.chart.bars[hoverBar]}${cards.chart.unit}`}
              </span>
            </div>
            <div className="mt-4 flex h-20 items-end gap-[3px]" onMouseLeave={() => setHoverBar(null)} aria-hidden>
              {cards.chart.bars.map((h, i) => (
                <span
                  // Re-keyed per view and project so the bars grow again on every switch.
                  key={`${view}-${project}-${i}`}
                  onMouseEnter={() => setHoverBar(i)}
                  className={cn(
                    "hero-bar flex-1 rounded-sm transition-colors",
                    hoverBar === null || hoverBar === i ? "bg-ink" : "bg-ink/35",
                  )}
                  style={{ height: `${Math.max((h / peak) * 100, 4)}%`, animationDelay: `${i * 18}ms` }}
                />
              ))}
            </div>
          </div>

          {/* Big number */}
          <div className="flex flex-col items-center justify-center rounded-2xl bg-lilac p-4 text-center text-ink">
            <span key={`${view}-${project}`} className="hero-pop display text-4xl tabular-nums">
              {cards.big.value}
            </span>
            <span className="mt-1 text-sm text-ink/60">{cards.big.label}</span>
          </div>

          {/* Alert picker */}
          <div className="rounded-2xl border border-[#232327] bg-[#141416] p-4 text-center">
            <p className="text-xs text-slate-500">Alerts for</p>
            <p className="mt-1 text-lg tracking-tight text-slate-900">Your team</p>
            <div className="mt-4 flex justify-center gap-2.5">
              {ALERTS.map(({ id, label, icon: Icon }) => {
                const active = alert === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setAlert(id)}
                    aria-pressed={active}
                    aria-label={`Show ${label.toLowerCase()} alert`}
                    title={label}
                    className={cn(
                      "flex size-11 items-center justify-center rounded-xl transition-all hover:-translate-y-0.5",
                      active ? "bg-[#f6f5f4] text-ink" : "bg-[#1f1f23] text-slate-800 hover:bg-[#2a2a2f]",
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-[#5b9cf6]">deadlines · budget · blockers</p>
          </div>

          {/* Selected alert */}
          <div
            key={`${alert}-${project}`}
            className="hero-pop relative h-28 overflow-hidden rounded-t-2xl bg-gradient-to-b from-[#2a2a2f] to-[#141416] p-4"
            aria-live="polite"
          >
            <p className="display truncate text-2xl text-slate-800/90">{shownAlert.title}</p>
            <p className="mt-1 truncate text-xs text-slate-500">{shownAlert.detail}</p>
          </div>

          {/* Meter */}
          <div className="relative h-28 rounded-t-2xl border border-b-0 border-[#232327] bg-[#141416] p-4 sm:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-lg tracking-tight text-slate-900">{cards.meter.title}</p>
              <span className="shrink-0 text-xs text-slate-500">{project}</span>
            </div>
            <div
              className="mt-4 h-2 rounded-full bg-[#1f1f23]"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={cards.meter.percent}
              aria-label={cards.meter.title}
            >
              <div
                className={cn(
                  "h-2 rounded-full transition-[width] duration-500 ease-out",
                  cards.meter.percent >= 80 ? "bg-[#f0a070]" : "bg-mint",
                )}
                style={{ width: `${cards.meter.percent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
