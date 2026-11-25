"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

export const authSubmitButtonClass =
  "w-full cursor-pointer transition-all duration-300 ease-out hover:-translate-y-0.5 hover:scale-[1.015] hover:shadow-[0_12px_28px_-6px_rgb(139_124_246/0.35)] active:translate-y-0 active:scale-[0.98]";

export function VaultCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [spot, setSpot] = useState({ x: 0, y: 0, rx: 0, ry: 0, active: false });

  function handleMove(e: React.PointerEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const nx = rect.width > 0 ? (x / rect.width - 0.5) * 2 : 0;
    const ny = rect.height > 0 ? (y / rect.height - 0.5) * 2 : 0;
    setSpot({ x, y, rx: -ny * 4, ry: nx * 4, active: true });
  }

  return (
    <div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={() => setSpot((s) => ({ ...s, rx: 0, ry: 0, active: false }))}
      className={cn(
        "group relative w-full max-w-[420px] overflow-hidden rounded-2xl border border-brand-400/20 bg-ink/70 p-7 shadow-soft backdrop-blur-md transition-[transform,border-color,box-shadow] duration-300 ease-out hover:border-brand-400/40 hover:shadow-[0_28px_70px_-12px_rgb(139_124_246/0.22)]",
        className,
      )}
      style={{
        transform: spot.active
          ? `perspective(900px) rotateX(${spot.rx}deg) rotateY(${spot.ry}deg)`
          : "perspective(900px) rotateX(0deg) rotateY(0deg)",
      }}
    >
      {/* Vault radial spotlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: spot.active ? 1 : 0,
          background: `radial-gradient(280px circle at ${spot.x}px ${spot.y}px, rgb(139 124 246 / 0.16), transparent 70%)`,
        }}
      />
      {/* Top vault rim highlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/45 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-100"
      />
      <div className="relative">{children}</div>
    </div>
  );
}
