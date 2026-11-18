import type { Metadata } from "next";
import Link from "next/link";
import {
  Bell,
  BellOff,
  CircleAlert,
  Clock,
  Flag,
  MessageSquare,
  UserPlus,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { cn, formatDateTime } from "@/lib/utils";
import type { NotificationType } from "@/generated/prisma/enums";
import { relativeTime } from "./relative-time";
import { markAllRead, openNotification } from "./actions";
import { RunAlertsButton } from "./run-alerts-button";

export const metadata: Metadata = { title: "Notifications" };
const PAGE_SIZE = 30;

const typeIcons: Record<NotificationType, { icon: LucideIcon; className: string }> = {
  TASK_ASSIGNED: { icon: UserPlus, className: "text-brand-600" },
  TASK_DUE_SOON: { icon: Clock, className: "text-amber-600" },
  TASK_OVERDUE: { icon: CircleAlert, className: "text-red-600" },
  MILESTONE_DUE_SOON: { icon: Flag, className: "text-amber-600" },
  BUDGET_ALERT: { icon: Wallet, className: "text-red-600" },
  PROJECT_UPDATE: { icon: MessageSquare, className: "text-brand-600" },
  GENERAL: { icon: Bell, className: "text-slate-500" },
};

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const search = await searchParams;
  const user = await requireUser();
  const tab = search.tab === "all" ? "all" : "unread";
  const page = Math.max(Number.parseInt(search.page ?? "1", 10) || 1, 1);

  const where = { userId: user.id, ...(tab === "unread" ? { readAt: null } : {}) };
  const [total, unreadCount, notifications] = await Promise.all([
    db.notification.count({ where }),
    db.notification.count({ where: { userId: user.id, readAt: null } }),
    db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, type: true, title: true, message: true, readAt: true, createdAt: true },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const tabLink = (t: "unread" | "all", label: string) => (
    <Link
      href={t === "all" ? "/notifications?tab=all" : "/notifications"}
      aria-current={tab === t ? "page" : undefined}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium",
        tab === t ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900",
      )}
    >
      {label}
    </Link>
  );

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Alerts about your tasks and projects."
        actions={user.role === "ADMIN" ? <RunAlertsButton /> : undefined}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav className="inline-flex rounded-lg bg-slate-100 p-1" aria-label="Filter notifications">
          {tabLink("unread", `Unread${unreadCount ? ` (${unreadCount})` : ""}`)}
          {tabLink("all", "All")}
        </nav>
        {unreadCount > 0 ? (
          <form action={markAllRead}>
            <button type="submit" className={buttonClasses("ghost", "sm")}>
              Mark all as read
            </button>
          </form>
        ) : null}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title={tab === "unread" ? "You're all caught up" : "No notifications yet"}
          description={tab === "unread" ? "New alerts about your tasks and projects will show up here." : undefined}
        />
      ) : (
        <Card className="divide-y divide-slate-100 overflow-hidden">
          {notifications.map((n) => {
            const { icon: Icon, className } = typeIcons[n.type];
            const unread = !n.readAt;
            return (
              <form key={n.id} action={openNotification}>
                <input type="hidden" name="id" value={n.id} />
                <button
                  type="submit"
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 sm:px-5",
                    unread && "bg-brand-50/50",
                  )}
                >
                  <Icon className={cn("mt-0.5 size-5 shrink-0", className)} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-3">
                      <span className={cn("text-sm text-slate-900", unread && "font-semibold")}>{n.title}</span>
                      <time
                        dateTime={n.createdAt.toISOString()}
                        title={formatDateTime(n.createdAt)}
                        className="shrink-0 text-xs text-slate-500"
                      >
                        {relativeTime(n.createdAt)}
                      </time>
                    </span>
                    <span className="mt-0.5 block break-words text-sm text-slate-600">{n.message}</span>
                  </span>
                  {unread ? (
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-600">
                      <span className="sr-only">Unread</span>
                    </span>
                  ) : (
                    <span className="size-2 shrink-0" aria-hidden />
                  )}
                </button>
              </form>
            );
          })}
        </Card>
      )}

      {pages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <span>
            Page {Math.min(page, pages)} of {pages}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={`?${tab === "all" ? "tab=all&" : ""}page=${page - 1}`} className={buttonClasses("outline", "sm")}>
                Newer
              </Link>
            ) : null}
            {page < pages ? (
              <Link href={`?${tab === "all" ? "tab=all&" : ""}page=${page + 1}`} className={buttonClasses("outline", "sm")}>
                Older
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
