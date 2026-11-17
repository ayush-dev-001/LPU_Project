import Link from "next/link";
import { Activity, LogOut } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { NavLinks } from "@/components/layout/nav-links";
import { MobileNav } from "@/components/layout/mobile-nav";
import { StatusBadge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { initials } from "@/lib/utils";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const unreadCount = await db.notification.count({ where: { userId: user.id, readAt: null } });

  const brand = (
    <div className="flex items-center gap-2 px-3">
      <span className="flex size-8 items-center justify-center rounded-lg bg-brand-600 text-white">
        <Activity className="size-4" aria-hidden />
      </span>
      <span className="font-semibold tracking-tight">ProjectPulse</span>
    </div>
  );
  const nav = <NavLinks role={user.role} unreadCount={unreadCount} />;

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-6 border-r border-slate-200 bg-white px-3 py-5 lg:flex print:hidden!">
        {brand}
        {nav}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6 print:hidden!">
          <div className="flex items-center gap-2">
            <MobileNav>
              <div className="flex flex-col gap-6">
                {brand}
                {nav}
              </div>
            </MobileNav>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge value={user.role} />
            <Link
              href="/profile"
              className="flex items-center gap-3 rounded-md px-1 py-1 hover:bg-slate-100"
              title="Your profile"
            >
              <span className="hidden text-right sm:block">
                <span className="block text-sm font-medium leading-tight">{user.name}</span>
                <span className="block text-xs text-slate-500">{user.email}</span>
              </span>
              <span
                className="flex size-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700"
                aria-hidden
              >
                {initials(user.name)}
              </span>
              <span className="sr-only">Your profile</span>
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:py-8 print:max-w-none print:p-0">{children}</main>
      </div>
    </div>
  );
}
