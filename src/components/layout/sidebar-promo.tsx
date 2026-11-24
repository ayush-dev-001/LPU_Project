import Link from "next/link";
import { ArrowRight } from "lucide-react";

/** The sand-coloured card at the bottom of the sidebar. */
export function SidebarPromo() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-sand p-5 text-ink">
      <p className="relative z-10 text-lg leading-snug tracking-tight">
        Small updates
        <br />
        keep big projects
        <br />
        on track.
      </p>
      <Link
        href="/updates"
        className="relative z-10 mt-4 inline-flex size-9 items-center justify-center rounded-full bg-ink text-sand transition-transform hover:translate-x-0.5"
        aria-label="Go to progress updates"
      >
        <ArrowRight className="size-4" aria-hidden />
      </Link>
      {/* Bars, echoing the chart cards in the design. */}
      <svg viewBox="0 0 120 60" className="absolute -right-2 bottom-0 h-20 w-32" aria-hidden>
        {[8, 22, 14, 34, 26, 46, 30].map((h, i) => (
          <rect key={i} x={i * 17} y={60 - h} width="11" height={h} rx="2" fill="#0b0b0c" opacity={0.1 + i * 0.03} />
        ))}
      </svg>
    </div>
  );
}
