"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

/** Hamburger menu that shows the sidebar on small screens. */
export function MobileNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Remember which page the menu was opened on; navigating away closes it automatically.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const close = () => setOpenOn(null);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpenOn(pathname)}
        className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </button>
      {open ? (
        <div className="fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-slate-900/40" onClick={close} aria-hidden />
          <div className="relative flex w-64 flex-col bg-white p-4 shadow-xl">
            <button
              type="button"
              onClick={close}
              className="mb-4 self-end rounded-md p-2 text-slate-600 hover:bg-slate-100"
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
            {children}
          </div>
        </div>
      ) : null}
    </div>
  );
}
