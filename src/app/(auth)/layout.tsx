import Link from "next/link";
import { BrandMark } from "@/components/layout/brand";
import { VaultCard } from "./vault-card";
import "./auth.css";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-dvh w-full overflow-hidden bg-gradient-to-br from-[#041413] via-[#071f1d] to-ink print:bg-white">
      {/* ───── Full-page background video (desktop only so 375px mobile skips download) ───── */}
      <video
        autoPlay
        loop
        muted
        playsInline
        poster="/login-bg-poster.jpg"
        className="pointer-events-none fixed inset-0 hidden h-full w-full object-cover md:block print:hidden"
        src="/login-bg.mp4"
      />
      {/* Subtle dark overlay across the full page for legibility */}
      <div
        className="pointer-events-none fixed inset-0 bg-gradient-to-br from-black/65 via-black/40 to-black/60 print:hidden"
        aria-hidden
      />

      {/* ───── Foreground content ───── */}
      <div className="relative z-10 flex min-h-dvh w-full flex-col md:flex-row">
        {/* Left: brand + editorial copy */}
        <div className="hidden w-1/2 flex-col justify-between p-10 md:flex lg:p-14">
          <Link href="/" className="anim-header flex items-center gap-3">
            <BrandMark className="size-10" />
            <span
              aria-label="ProjectPulse"
              className="text-2xl font-bold tracking-tight text-on-color"
            >
              {"ProjectPulse".split("").map((char, i) => (
                <span
                  key={i}
                  aria-hidden
                  className="anim-inflate-char"
                  style={{ "--i": i } as React.CSSProperties}
                >
                  {char}
                </span>
              ))}
            </span>
          </Link>

          <div>
            <h2 className="text-[clamp(2rem,3.6vw,3rem)] font-extrabold uppercase leading-[1.06] tracking-tight text-on-color">
              Your
              <br />
              Next Adventure
              <br />
              Awaits!
            </h2>
            <p className="mt-5 max-w-[340px] text-base leading-relaxed text-on-color/80">
              Log in to track your projects, monitor health scores,
              and pick up where you left off. Whether it&apos;s deadlines,
              budgets, or milestones.
            </p>
            <p className="mt-5 text-sm font-medium text-on-color/95">
              Your journey starts here
              <span className="anim-bouncy-period text-emerald-300">.</span>
            </p>
          </div>
        </div>

        {/* Right: glassmorphic form panel */}
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 sm:px-12 md:px-16">
          {/* Mobile-only brand */}
          <div className="mb-8 flex items-center gap-2.5 md:hidden">
            <BrandMark className="size-9" />
            <span className="text-xl font-bold tracking-tight text-on-color">
              ProjectPulse
            </span>
          </div>

          <VaultCard className="anim-card-in max-w-[380px] rounded-3xl bg-[#061c1a]/70 p-7 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.65)] backdrop-blur-xl sm:p-8">
            {children}
          </VaultCard>
        </div>
      </div>
    </main>
  );
}
