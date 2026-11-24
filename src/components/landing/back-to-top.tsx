"use client";

import { ArrowUp } from "lucide-react";

export function BackToTop() {
  const toTop = () => {
    window.scrollTo({
      top: 0,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
    // Move focus with the view, so keyboard users continue from the top too.
    document.querySelector<HTMLElement>("header a")?.focus({ preventScroll: true });
  };
  return (
    <button
      type="button"
      onClick={toTop}
      className="inline-flex items-center gap-2 self-start rounded-lg py-1 text-paper/70 transition-colors hover:text-mint sm:self-auto"
    >
      Back to top
      <ArrowUp className="size-4" aria-hidden />
    </button>
  );
}
