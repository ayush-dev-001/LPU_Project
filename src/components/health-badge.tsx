import {
  CheckCircle2,
  CircleDashed,
  CirclePause,
  CircleSlash,
  OctagonAlert,
  TriangleAlert,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import type { HealthLevel } from "@/lib/health";
import { cn } from "@/lib/utils";

// Status colours are reserved for health and always shown with an icon + label.
const LEVELS: Record<HealthLevel, { label: string; icon: LucideIcon; className: string }> = {
  ON_TRACK: { label: "On track", icon: CheckCircle2, className: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  AT_RISK: { label: "At risk", icon: TriangleAlert, className: "bg-amber-50 text-amber-900 ring-amber-200" },
  OFF_TRACK: { label: "Off track", icon: OctagonAlert, className: "bg-red-50 text-red-800 ring-red-200" },
  NOT_STARTED: { label: "Not started", icon: CircleDashed, className: "bg-slate-50 text-slate-700 ring-slate-200" },
  ON_HOLD: { label: "On hold", icon: CirclePause, className: "bg-slate-50 text-slate-700 ring-slate-200" },
  COMPLETED: { label: "Completed", icon: Trophy, className: "bg-slate-50 text-slate-700 ring-slate-200" },
  CANCELLED: { label: "Cancelled", icon: CircleSlash, className: "bg-slate-50 text-slate-500 ring-slate-200" },
};

export function healthLabel(level: HealthLevel) {
  return LEVELS[level].label;
}

/** "On track 92" style pill. Pass `score` to show the number. */
export function HealthBadge({
  level,
  score,
  className,
}: {
  level: HealthLevel;
  score?: number | null;
  className?: string;
}) {
  const { label, icon: Icon, className: tone } = LEVELS[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        tone,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
      {score != null ? <span className="font-semibold tabular-nums">· {score}</span> : null}
    </span>
  );
}

/** Thin 0–100 bar coloured by health level. */
export function ScoreBar({ level, score }: { level: HealthLevel; score: number }) {
  const fill =
    level === "ON_TRACK" ? "bg-[#0ca30c]" : level === "AT_RISK" ? "bg-[#fab219]" : level === "OFF_TRACK" ? "bg-[#d03b3b]" : "bg-slate-400";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`Health score ${score} of 100`}>
      <div className={cn("h-full rounded-full", fill)} style={{ width: `${score}%` }} />
    </div>
  );
}
