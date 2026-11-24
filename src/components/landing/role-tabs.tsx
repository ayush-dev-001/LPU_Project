"use client";

import { useId, useState } from "react";
import { ArrowRight, Briefcase, ShieldCheck, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

// Scenarios for each role, written as what happens in the app, not as quotes from real people.
const ROLES = [
  {
    id: "manager",
    role: "Manager",
    moment: "Catching a slipping project",
    icon: Briefcase,
    text: "Monday morning, PRJ-002 has dropped to At risk. The health card says why: 29% done with 89% of the time used, and two overdue tasks. You move work on the board and print a status report for the client.",
    steps: ["See the score drop", "Read the reasons", "Print a report"],
  },
  {
    id: "member",
    role: "Member",
    moment: "Reporting a blocker",
    icon: UserRound,
    text: "The card readers arrived but the network ports did not. You post an update, mark it as a blocker, and your manager is notified straight away instead of finding out on Friday.",
    steps: ["Open My tasks", "Post an update", "Flag the blocker"],
  },
  {
    id: "admin",
    role: "Admin",
    moment: "Onboarding the team",
    icon: ShieldCheck,
    text: "A new teammate joins. You add their account, give them the Member role and they see only the projects they belong to. When someone leaves, you deactivate them in one click.",
    steps: ["Add a user", "Pick a role", "They sign in"],
  },
] as const;

export function RoleTabs() {
  const [active, setActive] = useState(0);
  const uid = useId();
  const current = ROLES[active];

  // Arrow keys move between tabs, as the ARIA tabs pattern expects.
  const onKey = (e: React.KeyboardEvent) => {
    const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (active + step + ROLES.length) % ROLES.length;
    setActive(next);
    document.getElementById(`${uid}-tab-${next}`)?.focus();
  };

  return (
    <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-[0.9fr_1.4fr]">
      <div role="tablist" aria-orientation="vertical" aria-label="Roles" className="flex flex-col gap-2" onKeyDown={onKey}>
        {ROLES.map(({ id, role, moment, icon: Icon }, i) => {
          const selected = i === active;
          return (
            <button
              key={id}
              id={`${uid}-tab-${i}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${uid}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(i)}
              className={cn(
                "flex items-center gap-4 rounded-[14px] border px-4 py-3.5 text-left transition-colors",
                selected
                  ? "border-paper/10 bg-[#161619] text-paper"
                  : "border-transparent text-paper/55 hover:bg-paper/[0.03] hover:text-paper/85",
              )}
            >
              <span
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-full transition-colors",
                  selected ? "bg-electric text-ink" : "bg-paper/[0.06]",
                )}
              >
                <Icon className="size-[18px] stroke-[1.7]" aria-hidden />
              </span>
              <span>
                <span className="block text-[16px] font-semibold tracking-[-0.01em]">{role}</span>
                <span className="block text-[13.5px] text-paper/50">{moment}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div
        id={`${uid}-panel`}
        role="tabpanel"
        aria-labelledby={`${uid}-tab-${active}`}
        className="relative overflow-hidden rounded-[20px] border border-paper/[0.07] bg-gradient-to-br from-[#18181b] to-[#0e0e10] p-7 sm:p-10"
      >
        <div className="pointer-events-none absolute -right-24 -top-24 size-[300px] rounded-full bg-lilac/15 blur-[90px]" aria-hidden />
        <div key={current.id} className="hero-pop relative">
          <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-electric">{current.moment}</p>
          <p className="mt-5 text-[clamp(1.2rem,2vw,1.6rem)] font-medium leading-[1.35] tracking-[-0.02em] text-paper">
            {current.text}
          </p>
          <ol className="mt-9 flex flex-wrap items-center gap-2 text-[13.5px]">
            {current.steps.map((s, i) => (
              <li key={s} className="flex items-center gap-2">
                <span className="rounded-full border border-paper/10 bg-paper/[0.04] px-3.5 py-1.5 text-paper/80">{s}</span>
                {i < current.steps.length - 1 && <ArrowRight className="size-3.5 text-paper/30" aria-hidden />}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
