"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// One entry per tab. Each tab is a folder under src/app/(app)/projects/[id]/.
const TABS = [
  { segment: "", label: "Overview" },
  { segment: "tasks", label: "Tasks" },
  { segment: "timeline", label: "Timeline" },
  { segment: "updates", label: "Updates" },
  { segment: "budget", label: "Budget" },
  { segment: "documents", label: "Documents" },
];

export function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;

  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto border-b border-slate-200" aria-label="Project sections">
      {TABS.map(({ segment, label }) => {
        const href = segment ? `${base}/${segment}` : base;
        const active = segment ? pathname.startsWith(href) : pathname === base;
        return (
          <Link
            key={label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
