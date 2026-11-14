import { cn, humanize } from "@/lib/utils";

export type Tone = "gray" | "blue" | "green" | "amber" | "red" | "violet";

const tones: Record<Tone, string> = {
  gray: "bg-slate-100 text-slate-700",
  blue: "bg-blue-50 text-blue-700",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-800",
  red: "bg-red-50 text-red-700",
  violet: "bg-violet-50 text-violet-700",
};

export function Badge({ tone = "gray", className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}

/** Colours for every enum value, so the same status always looks the same everywhere. */
const enumTones: Record<string, Tone> = {
  // ProjectStatus
  PLANNING: "gray",
  ACTIVE: "blue",
  ON_HOLD: "amber",
  COMPLETED: "green",
  CANCELLED: "red",
  // MilestoneStatus
  PENDING: "gray",
  // TaskStatus
  TODO: "gray",
  IN_PROGRESS: "blue",
  IN_REVIEW: "violet",
  DONE: "green",
  // TaskPriority
  LOW: "gray",
  MEDIUM: "blue",
  HIGH: "amber",
  URGENT: "red",
  // Role
  ADMIN: "violet",
  MANAGER: "blue",
  MEMBER: "gray",
};

export function StatusBadge({ value, className }: { value: string; className?: string }) {
  return (
    <Badge tone={enumTones[value] ?? "gray"} className={className}>
      {humanize(value)}
    </Badge>
  );
}
