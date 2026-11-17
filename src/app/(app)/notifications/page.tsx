import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  Clock3,
  Flag,
  MessageSquareText,
  UserPlus,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { NotificationType } from "@/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { markAllRead, openNotification, runAlertsNow } from "./actions";
import { relativeTime } from "./relative-time";

export const metadata: Metadata = { title: "Notifications" };
const PAGE_SIZE = 30;
const ICONS: Record<NotificationType, LucideIcon> = {
  TASK_ASSIGNED: UserPlus,
  TASK_DUE_SOON: Clock3,
  TASK_OVERDUE: AlertTriangle,
  MILESTONE_DUE_SOON: Flag,
  BUDGET_ALERT: Wallet,
  PROJECT_UPDATE: MessageSquareText,
  GENERAL: Bell,
};

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string; alertsCreated?: string }>;
}) {
  const [user, query] = await Promise.all([requireUser(), searchParams]);
  const unreadOnly = query.tab === "unread";
  const requestedPage = Number.parseInt(query.page ?? "1", 10);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const where = { userId: user.id, ...(unreadOnly ? { readAt: null } : {}) };
  const [notifications, total, unreadCount] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.notification.count({ where }),
    db.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);
  const alertsCreated = Number.parseInt(query.alertsCreated ?? "", 10);

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Updates and reminders that need your attention."
        actions={
          <div className="flex flex-wrap gap-2">
            {unreadCount > 0 ? (
              <form action={markAllRead}>
                <Button type="submit" variant="outline" size="sm">Mark all as read</Button>
              </form>
            ) : null}
            {user.role === "ADMIN" ? (
              <form action={runAlertsNow}>
                <Button type="submit" size="sm">Run alerts now</Button>
              </form>
            ) : null}
          </div>
        }
      />
      {Number.isSafeInteger(alertsCreated) && alertsCreated >= 0 ? (
        <p role="status" className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Created {alertsCreated} alert{alertsCreated === 1 ? "" : "s"}.
        </p>
      ) : null}
      <div className="mb-4 flex gap-2 border-b border-slate-200">
        <Link
          href="/notifications?tab=unread"
          aria-current={unreadOnly ? "page" : undefined}
          className={`border-b-2 px-3 py-2 text-sm font-medium ${unreadOnly ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
        >
          Unread <Badge tone={unreadOnly ? "blue" : "gray"}>{unreadCount}</Badge>
        </Link>
        <Link
          href="/notifications?tab=all"
          aria-current={!unreadOnly ? "page" : undefined}
          className={`border-b-2 px-3 py-2 text-sm font-medium ${!unreadOnly ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
        >
          All
        </Link>
      </div>
      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title={unreadOnly ? "You're all caught up" : "No notifications yet"} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <ul className="divide-y divide-slate-100">
            {notifications.map((notification) => {
              const Icon = ICONS[notification.type];
              return (
                <li key={notification.id}>
                  <form action={openNotification.bind(null, notification.id)}>
                    <button
                      type="submit"
                      className={`flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-slate-50 ${notification.readAt ? "bg-white" : "bg-brand-50/60"}`}
                    >
                      <span className="relative mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                        <Icon className="size-4" aria-hidden />
                        {!notification.readAt ? <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-brand-600 ring-2 ring-white" aria-label="Unread" /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-slate-900">{notification.title}</span>
                        <span className="mt-0.5 block whitespace-pre-line text-sm text-slate-600">{notification.message}</span>
                        <span className="mt-1 block text-xs text-slate-500">{relativeTime(notification.createdAt)}</span>
                      </span>
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {notifications.length > 0 ? (
        <div className="mt-4 flex justify-between text-sm">
          {page > 1 ? <Link href={`/notifications?tab=${unreadOnly ? "unread" : "all"}&page=${page - 1}`} className="text-brand-700 hover:underline">Previous page</Link> : <span />}
          {page * PAGE_SIZE < total ? <Link href={`/notifications?tab=${unreadOnly ? "unread" : "all"}&page=${page + 1}`} className="text-brand-700 hover:underline">Next page</Link> : null}
        </div>
      ) : null}
    </div>
  );
}
