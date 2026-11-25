"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/layout/brand";
import { VaultCard } from "./vault-card";

/**
 * Full-screen auth shell rendered by /login and /register without modifying (auth)/layout.tsx.
 * Only mounts the background <video> on md+ viewports so 375px mobile devices never download it.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <div className="fixed inset-0 z-10 flex min-h-dvh w-full overflow-y-auto bg-ink print:static print:bg-white">
      {/* ───── Full-page background video (mounted only on md+ viewports) ───── */}
      {isDesktop ? (
        <video
          autoPlay
          loop
          muted
          playsInline
          poster="/login-bg-poster.jpg"
          className="pointer-events-none fixed inset-0 h-full w-full object-cover print:hidden"
          src="/login-bg.mp4"
        />
      ) : null}

      {/* Subtle dark gradient overlay */}
      <div
        className="pointer-events-none fixed inset-0 bg-gradient-to-br from-ink/70 via-ink/45 to-ink/65 print:hidden"
        aria-hidden
      />

      {/* ───── Foreground content ───── */}
      <div className="relative z-10 flex min-h-dvh w-full flex-col md:flex-row">
        {/* Left: brand + editorial copy */}
        <div className="hidden w-1/2 flex-col justify-between p-10 md:flex lg:p-14">
          <Link href="/" className="group flex items-center gap-3">
            <BrandMark className="size-10 transition-transform duration-300 group-hover:scale-105" />
            <span
              aria-label="ProjectPulse"
              className="text-2xl font-bold tracking-tight text-on-color"
            >
              {"ProjectPulse".split("").map((char, i) => (
                <span
                  key={i}
                  aria-hidden
                  className="inline-block transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:scale-110"
                  style={{ transitionDelay: `${i * 20}ms` }}
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
              <span className="inline-block text-brand-400 motion-safe:animate-bounce">.</span>
            </p>
          </div>
        </div>

        {/* Right: glassmorphic form card */}
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 sm:px-12 md:px-16">
          {/* Mobile-only brand */}
          <div className="mb-8 flex items-center gap-2.5 md:hidden">
            <BrandMark className="size-9" />
            <span className="text-xl font-bold tracking-tight text-on-color">
              ProjectPulse
            </span>
          </div>

          <VaultCard className="hero-pop max-w-[380px] rounded-3xl bg-ink/75 p-7 backdrop-blur-xl sm:p-8">
            {children}
          </VaultCard>
        </div>
      </div>
    </div>
  );
}
