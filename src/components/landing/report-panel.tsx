"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

// Sample output shaped like the app's status report and task CSV export (some CSV columns left out to fit).
const SAMPLES = {
  report: {
    label: "Status report",
    text: `PRJ-002 · Office access system
Status: At risk (score 58 / 100)

Progress     12 of 22 tasks done (55%)
Schedule     70% of the time used
Budget       ₹2,40,000 of ₹3,00,000 spent (80%)
Milestones   2 of 3 reached

Why the score dropped
  − Overdue tasks: 2                     −16
  − Spending ahead of progress           −15
  − Open blocker in the latest update    −11`,
  },
  csv: {
    label: "Tasks CSV",
    text: `Project,Title,Status,Priority,Assignee,Due date,Overdue
PRJ-002,Site survey,DONE,MEDIUM,Aman Gupta,2026-10-02,No
PRJ-002,Run network cabling,IN_PROGRESS,HIGH,Sneha Iyer,2026-11-20,Yes
PRJ-002,Install card readers,TODO,HIGH,Aman Gupta,2026-11-28,No
PRJ-002,Attendance app login,IN_REVIEW,MEDIUM,Karan Mehta,2026-12-04,No`,
  },
} as const;

type Key = keyof typeof SAMPLES;

export function ReportPanel() {
  const [tab, setTab] = useState<Key>("report");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(t);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SAMPLES[tab].text);
      setCopied(true);
    } catch {
      // The clipboard can be blocked; the text stays selectable.
    }
  };

  return (
    <div className="overflow-hidden rounded-[18px] border border-paper/10 bg-[#0c0c0e]">
      <div className="flex items-center gap-1 border-b border-paper/[0.07] px-2 py-2">
        <div role="tablist" aria-label="Sample output" className="flex gap-1">
          {(Object.keys(SAMPLES) as Key[]).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                tab === key ? "bg-paper/[0.08] text-paper" : "text-paper/50 hover:text-paper",
              )}
            >
              {SAMPLES[key].label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void copy()}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] text-paper/60 transition-colors hover:bg-paper/[0.06] hover:text-paper"
        >
          {copied ? <Check className="size-3.5 text-mint" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
          <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-[1.7] text-paper/80">
        <code>{SAMPLES[tab].text}</code>
      </pre>
    </div>
  );
}
