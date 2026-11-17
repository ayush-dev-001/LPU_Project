"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  FileBarChart,
  FolderClosed,
  House,
  ListChecks,
  MessageSquareText,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/generated/prisma/enums";

type NavItem = { href: string; label: string; icon: LucideIcon; roles?: Role[]; top?: string };

// To add a page to the navigation, add it here. `roles` limits who sees the link
// (the page itself must still check permissions). `top` also shows it in the top bar.
const NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: House, top: "Dashboard" },
  { href: "/projects", label: "Projects", icon: FolderClosed, top: "Projects" },
  { href: "/tasks", label: "My tasks", icon: ListChecks, top: "Tasks" },
  { href: "/updates", label: "Updates", icon: MessageSquareText, top: "Updates" },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/reports", label: "Reports", icon: FileBarChart, roles: ["ADMIN", "MANAGER"], top: "Reports" },
  { href: "/admin/users", label: "Users", icon: Users, roles: ["ADMIN"] },
  { href: "/profile", label: "Settings", icon: Settings },
];

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

const allowed = (role: Role) => NAV.filter((item) => !item.roles || item.roles.includes(role));

/** The sidebar list (also used inside the mobile menu). */
export function NavLinks({ role, unreadCount }: { role: Role; unreadCount: number }) {
  const isActive = useIsActive();

  return (
    <nav className="flex flex-col gap-1">
      {allowed(role).map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-full px-3 py-2 text-[15px] transition-colors",
              active
                ? "bg-stone-200/70 font-semibold text-slate-900"
                : "text-slate-600 hover:bg-white/70 hover:text-slate-900",
            )}
          >
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-full",
                active ? "bg-slate-900 text-white" : "text-slate-500",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
            </span>
            <span className="flex-1">{label}</span>
            {href === "/notifications" && unreadCount > 0 ? (
              <span className="flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold leading-5 text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

/** The centred links in the top bar (large screens only). */
export function TopNav({ role }: { role: Role }) {
  const isActive = useIsActive();

  return (
    <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
      {allowed(role)
        .filter((item) => item.top)
        .map(({ href, top }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative px-4 py-5 text-[15px] transition-colors",
                active ? "font-semibold text-slate-900" : "text-slate-500 hover:text-slate-900",
              )}
            >
              {top}
              {active ? (
                <span className="absolute inset-x-4 bottom-2.5 h-0.5 rounded-full bg-slate-900" aria-hidden />
              ) : null}
            </Link>
          );
        })}
    </nav>
  );
}
