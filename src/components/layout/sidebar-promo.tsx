import Link from "next/link";
import { ArrowRight } from "lucide-react";

/** The soft lavender card at the bottom of the sidebar. */
export function SidebarPromo() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#ece7fb] to-[#ddd4f7] p-5">
      <p className="relative z-10 text-lg font-medium leading-snug text-slate-900">
        Small updates
        <br />
        keep big projects
        <br />
        on track.
      </p>
      <Link
        href="/updates"
        className="relative z-10 mt-4 inline-flex size-9 items-center justify-center rounded-full bg-slate-900 text-white transition-transform hover:translate-x-0.5"
        aria-label="Go to progress updates"
      >
        <ArrowRight className="size-4" aria-hidden />
      </Link>
      {/* Hills */}
      <svg viewBox="0 0 200 80" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-20 w-full" aria-hidden>
        <path d="M0 55 C30 35 55 40 80 50 S140 30 200 45 V80 H0Z" fill="#cdc1f2" opacity="0.7" />
        <path d="M0 68 C40 52 70 62 110 58 S170 50 200 60 V80 H0Z" fill="#bfb1ee" opacity="0.8" />
      </svg>
    </div>
  );
}
