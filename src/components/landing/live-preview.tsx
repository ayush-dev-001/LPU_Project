"use client";

import { useState } from "react";
import { Check, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * The hero's interactive preview. Left: a project as its team works on it.
 * Right: that project's health score, worked out again on every click.
 * Sample data in the browser only, using simplified versions of the real health rules
 * (schedule, blockers, budget and silent projects).
 */

const TIME_USED = 70; // % of the project's time already gone

const TASKS = [
  { id: "survey", title: "Site survey", who: "Aman" },
  { id: "cabling", title: "Run network cabling", who: "Sneha" },
  { id: "readers", title: "Install card readers", who: "Aman" },
  { id: "app", title: "Attendance app login", who: "Karan" },
  { id: "training", title: "Train office staff", who: "Neha" },
] as const;

type TaskId = (typeof TASKS)[number]["id"];
type Signal = "blocker" | "expense" | "update";
type Event = { id: number; at: string; kind: string; text: string };

export function Switch({ on, label, onToggle }: { on: boolean; label: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className={cn(
        "relative h-6 w-10 shrink-0 rounded-full transition-colors duration-200",
        on ? "bg-mint" : "bg-paper/15",
      )}
    >
      <span
        className={cn(
          "absolute left-1 top-1 size-4 rounded-full transition-transform duration-200",
          on ? "translate-x-4 bg-ink" : "bg-paper",
        )}
      />
    </button>
  );
}

function score(done: number, signals: Record<Signal, boolean>) {
  const factors: { label: string; impact: number }[] = [];
  const donePct = (done / TASKS.length) * 100;
  const behind = TIME_USED - donePct - 10;
  if (behind > 0) factors.push({ label: `Behind schedule: ${Math.round(donePct)}% done, ${TIME_USED}% of time used`, impact: Math.min(35, Math.round(behind * 0.9)) });
  if (signals.blocker) factors.push({ label: "Open blocker in the latest update", impact: 12 });
  if (signals.expense) factors.push({ label: "Spending ahead of progress (85% of budget)", impact: 15 });
  if (!signals.update) factors.push({ label: "No progress update for 16 days", impact: 10 });
  const value = Math.max(0, 100 - factors.reduce((s, f) => s + f.impact, 0));
  const level = value >= 75 ? "On track" : value >= 50 ? "At risk" : "Off track";
  return { value, level, factors };
}

export function LivePreview() {
  const [done, setDone] = useState<Record<TaskId, boolean>>({
    survey: true,
    cabling: false,
    readers: false,
    app: false,
    training: false,
  });
  const [signals, setSignals] = useState<Record<Signal, boolean>>({ blocker: true, expense: false, update: false });
  const [events, setEvents] = useState<Event[]>([]);

  const log = (kind: string, text: string) =>
    setEvents((list) =>
      [{ id: Date.now() + Math.random(), at: new Date().toLocaleTimeString([], { hour12: false }), kind, text }, ...list].slice(0, 3),
    );

  const toggleTask = (id: TaskId) => {
    const next = !done[id];
    setDone((d) => ({ ...d, [id]: next }));
    const task = TASKS.find((t) => t.id === id)!;
    log(next ? "task.done" : "task.reopened", task.title);
  };

  const toggleSignal = (key: Signal) => {
    const next = !signals[key];
    setSignals((s) => ({ ...s, [key]: next }));
    if (key === "blocker") log(next ? "update.blocker" : "blocker.cleared", "Waiting for network ports");
    if (key === "expense") log(next ? "notify.budget" : "expense.removed", next ? "Budget 80% used → manager" : "Cabling invoice");
    if (key === "update") log(next ? "update.posted" : "update.removed", "Weekly progress from Aman");
  };

  const doneCount = Object.values(done).filter(Boolean).length;
  const health = score(doneCount, signals);
  const pill = health.level === "On track" ? "bg-mint" : health.level === "At risk" ? "bg-[#f5c46b]" : "bg-[#f0a070]";

  return (
    <div
      id="demo"
      className="scroll-mt-24 rounded-[22px] border border-paper/10 bg-[#111113]/90 p-2 shadow-[0_40px_120px_rgb(0_0_0/0.55)] backdrop-blur"
    >
      <div className="flex items-center gap-1.5 px-3 py-2.5" aria-hidden>
        <span className="size-2.5 rounded-full bg-paper/15" />
        <span className="size-2.5 rounded-full bg-paper/15" />
        <span className="size-2.5 rounded-full bg-paper/15" />
        <span className="ml-3 font-mono text-[12px] text-paper/40">Interactive preview: tick a task, flip a signal</span>
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-[1.1fr_1fr]">
        {/* The team's side */}
        <div className="flex flex-col rounded-[16px] bg-[#0c0c0e] p-4 text-left sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[15px] font-semibold text-paper">PRJ-002 · Office access system</p>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-mint/10 px-2.5 py-1 font-mono text-[11px] text-mint">
              <span className="size-1.5 animate-pulse rounded-full bg-mint" aria-hidden />
              {TIME_USED}% of time used
            </span>
          </div>

          <ul className="mt-4 divide-y divide-paper/[0.06] rounded-xl border border-paper/[0.06]">
            {TASKS.map((t) => {
              const on = done[t.id];
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => toggleTask(t.id)}
                    className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-paper/[0.03]"
                  >
                    <span
                      className={cn(
                        "grid size-5 shrink-0 place-items-center rounded-md border transition-colors",
                        on ? "border-mint bg-mint text-ink" : "border-paper/25",
                      )}
                    >
                      {on && <Check className="size-3.5" aria-hidden />}
                    </span>
                    <span className={cn("min-w-0 flex-1 truncate text-[14px]", on ? "text-paper/45 line-through" : "text-paper")}>
                      {t.title}
                    </span>
                    <span className="text-[12px] text-paper/40">{t.who}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <ul className="mt-3 grid gap-2 sm:grid-cols-3">
            {(
              [
                ["blocker", "Blocker open"],
                ["expense", "Big expense"],
                ["update", "Update posted"],
              ] as const
            ).map(([key, label]) => (
              <li key={key} className="flex items-center justify-between gap-2 rounded-xl bg-paper/[0.04] px-3 py-2">
                <span className="text-[13px] text-paper/70">{label}</span>
                <Switch on={signals[key]} label={label} onToggle={() => toggleSignal(key)} />
              </li>
            ))}
          </ul>

          <div className="mt-3 min-h-[76px] rounded-xl bg-black/40 p-3 font-mono text-[11.5px] leading-relaxed" aria-live="polite">
            {events.length === 0 ? (
              <p className="text-paper/35">Waiting for a change…</p>
            ) : (
              <ul>
                {events.map((e) => (
                  <li key={e.id} className="hero-pop truncate text-paper/55">
                    <span className="text-paper/30">{e.at}</span> <span className="text-mint">{e.kind}</span> {e.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* The manager's dashboard */}
        <div className="flex min-h-[320px] flex-col rounded-[16px] bg-sand p-5 text-left text-ink sm:p-6">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-medium uppercase tracking-wide text-ink/50">Project health</p>
            <span className={cn("rounded-full px-2.5 py-1 text-[12px] font-semibold text-ink transition-colors", pill)}>
              {health.level}
            </span>
          </div>
          <p className="mt-3 flex items-baseline gap-2">
            <span key={health.value} className="hero-pop text-[72px] font-bold leading-none tracking-[-0.06em] tabular-nums">
              {health.value}
            </span>
            <span className="text-lg text-ink/50">/ 100</span>
          </p>
          <div className="mt-4 h-2 rounded-full bg-ink/10" aria-hidden>
            <div className="h-2 rounded-full bg-ink transition-[width] duration-500 ease-out" style={{ width: `${health.value}%` }} />
          </div>
          <p className="mt-6 text-[12px] font-medium uppercase tracking-wide text-ink/50">Why</p>
          {health.factors.length === 0 ? (
            <p className="mt-2 text-[14px] text-ink/70">Nothing is pulling this project down.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {health.factors.map((f) => (
                <li key={f.label} className="flex items-start gap-2 text-[13.5px] leading-snug">
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-ink/50" aria-hidden />
                  <span className="min-w-0 flex-1">{f.label}</span>
                  <span className="shrink-0 font-mono text-[12.5px] text-ink/60">−{f.impact}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-auto pt-5 text-[12.5px] text-ink/55">On track from 75, at risk from 50.</p>
        </div>
      </div>
    </div>
  );
}
