import Link from "next/link";

/** ProjectPulse logo: four petals around a pulse dot. */
export function BrandMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <g fill="none" strokeWidth="3" className="stroke-accent-500">
        <circle cx="11" cy="11" r="6.5" />
        <circle cx="21" cy="11" r="6.5" />
        <circle cx="11" cy="21" r="6.5" />
        <circle cx="21" cy="21" r="6.5" />
      </g>
      <circle cx="16" cy="16" r="2.5" className="fill-accent-500" />
    </svg>
  );
}

export function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5">
      <BrandMark />
      <span className="text-lg font-bold tracking-tight text-slate-900">ProjectPulse</span>
    </Link>
  );
}
