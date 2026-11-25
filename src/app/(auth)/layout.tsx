import Link from "next/link";
import { BrandMark } from "@/components/layout/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f8f8] p-4 dark:bg-[#08080a] print:bg-white">
      <div className="flex w-full max-w-[960px] overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#141416]">
        {/* ───── Left: video panel ───── */}
        <div className="relative hidden w-[46%] shrink-0 overflow-hidden md:block">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
            src="/login-bg.mp4"
          />
          {/* Dark overlay for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/40" />

          {/* Content over the video */}
          <div className="relative flex h-full flex-col justify-between p-7">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <BrandMark className="size-7" />
              <span className="text-base font-bold tracking-tight text-on-color">
                ProjectPulse
              </span>
            </Link>

            {/* Bottom text */}
            <div>
              <h2 className="text-[clamp(1.6rem,3vw,2.2rem)] font-extrabold uppercase leading-[1.05] tracking-tight text-on-color">
                Your
                <br />
                Next Adventure
                <br />
                Awaits!
              </h2>
              <p className="mt-4 max-w-[280px] text-sm leading-relaxed text-on-color/80">
                Log in to track your projects, monitor health scores,
                and pick up where you left off. Whether it&apos;s deadlines,
                budgets, or milestones.
              </p>
              <p className="mt-4 text-sm font-medium text-on-color/95">
                Your journey starts here.
              </p>
            </div>
          </div>
        </div>

        {/* ───── Right: form ───── */}
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 sm:px-10 md:px-12">
          {/* Mobile-only brand (hidden on desktop since the left panel has it) */}
          <div className="mb-8 flex items-center gap-2.5 md:hidden">
            <BrandMark className="size-9" />
            <span className="text-xl font-bold tracking-tight text-slate-900">
              ProjectPulse
            </span>
          </div>
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
    </main>
  );
}
