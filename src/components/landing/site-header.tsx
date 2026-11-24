"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { BrandMark } from "@/components/layout/brand";
import { cn } from "@/lib/utils";
import { NAV } from "./nav";

export function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2 text-[19px] font-bold tracking-tight text-paper">
      <BrandMark className="size-7" />
      ProjectPulse
    </Link>
  );
}

/** The id of the section under the header, for the nav's active state. */
function useActiveSection(ids: readonly string[]) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const seen = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) seen.set(entry.target.id, entry.isIntersecting);
        setActive(ids.find((id) => seen.get(id)) ?? null);
      },
      // A band across the upper middle of the screen: a section counts once it fills that band.
      { rootMargin: "-35% 0px -60% 0px" },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

const IDS = NAV.map((n) => n.id);

/** Fixed glass bar over the landing page. Turns solid once the page scrolls under it. */
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const active = useActiveSection(IDS);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onResize = () => window.innerWidth >= 768 && setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4">
      <div
        className={cn(
          "mx-auto max-w-[1080px] rounded-2xl border transition-[background-color,border-color,box-shadow] duration-300",
          scrolled || open
            ? "border-paper/10 bg-[#0f0f11]/85 shadow-[0_12px_40px_rgb(0_0_0/0.35)] backdrop-blur-xl"
            : "border-paper/5 bg-paper/[0.03] backdrop-blur-md",
        )}
      >
        <nav aria-label="Site" className="flex h-14 items-center gap-6 px-3 sm:px-4">
          <Wordmark />
          <ul className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  aria-current={active === item.id ? "true" : undefined}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-[14px] transition-colors",
                    active === item.id ? "bg-paper/[0.07] text-paper" : "text-paper/60 hover:text-paper",
                  )}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="hidden rounded-lg px-3 py-1.5 text-[14px] text-paper/70 transition-colors hover:text-paper sm:block"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-[9px] bg-mint px-4 py-2 text-[14px] font-semibold text-ink transition-[filter] hover:brightness-110"
            >
              Get started
            </Link>
            <button
              type="button"
              aria-expanded={open}
              aria-controls="site-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
              className="grid size-9 place-items-center rounded-lg text-paper/80 transition-colors hover:bg-paper/[0.07] hover:text-paper md:hidden"
            >
              {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
            </button>
          </div>
        </nav>

        {open && (
          <div id="site-menu" className="border-t border-paper/[0.07] px-3 pb-3 md:hidden">
            <ul className="pt-2">
              {NAV.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    onClick={close}
                    className="block rounded-lg px-3 py-2.5 text-[15px] text-paper/80 hover:bg-paper/[0.06] hover:text-paper"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
              <li>
                <Link
                  href="/login"
                  onClick={close}
                  className="block rounded-lg px-3 py-2.5 text-[15px] text-paper/80 hover:bg-paper/[0.06] hover:text-paper"
                >
                  Sign in
                </Link>
              </li>
            </ul>
          </div>
        )}
      </div>
    </header>
  );
}
