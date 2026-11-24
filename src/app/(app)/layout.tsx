import Link from "next/link";
import { Bell, LogOut, Search } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { Brand } from "@/components/layout/brand";
import { NavLinks, TopNav } from "@/components/layout/nav-links";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SidebarPromo } from "@/components/layout/sidebar-promo";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { initials } from "@/lib/utils";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const unreadCount = await db.notification.count({ where: { userId: user.id, readAt: null } });
  const nav = <NavLinks role={user.role} unreadCount={unreadCount} />;

  return (
    <div className="mx-auto min-h-screen max-w-[1500px] px-3 pb-8 pt-3 sm:px-5 sm:pt-4 print:max-w-none print:p-0">
      <header className="sticky top-3 z-30 flex h-16 items-center justify-between gap-3 rounded-3xl border border-stone-200/70 bg-white px-3 shadow-soft sm:top-4 sm:px-5 print:hidden!">
        <div className="flex items-center gap-1">
          <MobileNav>
            <div className="flex flex-col gap-6">
              <Brand />
              {nav}
            </div>
          </MobileNav>
          <Brand />
        </div>

        <TopNav role={user.role} />

        <div className="flex items-center gap-1.5 sm:gap-3">
          <form action="/projects" method="get" role="search" className="hidden xl:block">
            <label className="flex h-11 w-60 items-center gap-2 rounded-full bg-stone-100 px-4 text-sm text-slate-500 focus-within:ring-2 focus-within:ring-brand-500/30">
              <Search className="size-4 shrink-0" aria-hidden />
              <span className="sr-only">Search projects</span>
              <input
                name="q"
                type="search"
                placeholder="Search projects…"
                className="w-full bg-transparent text-slate-900 placeholder:text-slate-500 focus:outline-none"
              />
            </label>
          </form>

          <Link
            href="/notifications"
            className="relative rounded-full p-2.5 text-slate-700 hover:bg-stone-100"
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
            title="Notifications"
          >
            <Bell className="size-5" aria-hidden />
            {unreadCount > 0 ? (
              <span className="absolute right-2 top-2 size-2 rounded-full bg-red-500 ring-2 ring-white" aria-hidden />
            ) : null}
          </Link>

          <span className="hidden h-8 w-px bg-stone-200 sm:block" aria-hidden />

          <Link href="/profile" className="flex items-center gap-2.5 rounded-full p-0.5 hover:bg-stone-100 sm:pr-3" title="Your profile">
            <span
              className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-[#f29a74] text-sm font-semibold text-on-color"
              aria-hidden
            >
              {initials(user.name)}
            </span>
            <span className="hidden text-left md:block">
              <span className="block text-sm font-semibold leading-tight">{user.name}</span>
              <span className="block text-xs capitalize text-slate-500">{user.role.toLowerCase()}</span>
            </span>
            <span className="sr-only">Your profile</span>
          </Link>

          <form action={logout}>
            <button
              type="submit"
              className="rounded-full p-2.5 text-slate-500 hover:bg-stone-100 hover:text-slate-900"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </header>

      <div className="mt-6 flex gap-8 print:mt-0">
        <aside className="sticky top-28 hidden h-[calc(100vh-8.5rem)] w-56 shrink-0 flex-col justify-between gap-6 lg:flex print:hidden!">
          {nav}
          <SidebarPromo />
        </aside>

        <main className="min-w-0 flex-1 print:max-w-none print:p-0">{children}</main>
      </div>
    </div>
  );
}
