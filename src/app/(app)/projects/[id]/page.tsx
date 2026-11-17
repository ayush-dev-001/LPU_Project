import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  Edit,
  Flame,
  Milestone as MilestoneIcon,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getProjectAccess } from "@/lib/permissions";
import { db } from "@/lib/db";
import { formatDate, formatINR, daysFromNow } from "@/lib/utils";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { MembersCard } from "./members";
import { MilestonesCard } from "./milestones";

export const metadata: Metadata = { title: "Project Overview" };

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  // Ensures user has access or 404s
  const access = await getProjectAccess(user, id);

  const project = await db.project.findUnique({
    where: { id },
    include: {
      manager: { select: { id: true, name: true, email: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
      milestones: {
        include: {
          tasks: { select: { id: true, status: true } },
        },
        orderBy: { dueDate: "asc" },
      },
      tasks: {
        select: {
          id: true,
          status: true,
          dueDate: true,
          assigneeId: true,
        },
      },
      updates: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
  });

  if (!project) notFound();

  // Active users not already in the project for Add Member dropdown
  const allActiveUsers = access.canManage
    ? await db.user.findMany({
        where: { isActive: true },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      })
    : [];

  const existingUserIds = new Set([
    project.managerId,
    ...project.members.map((m) => m.userId),
  ]);
  const availableUsers = allActiveUsers.filter((u) => !existingUserIds.has(u.id));

  // Undone task counts per assignee
  const undoneTaskCounts = new Map<string, number>();
  for (const task of project.tasks) {
    if (task.assigneeId && task.status !== "DONE") {
      undoneTaskCounts.set(
        task.assigneeId,
        (undoneTaskCounts.get(task.assigneeId) ?? 0) + 1,
      );
    }
  }

  const membersWithTasks = project.members.map((m) => ({
    user: m.user,
    undoneTaskCount: undoneTaskCounts.get(m.user.id) ?? 0,
  }));

  // Quick stats calculations
  const totalTasks = project.tasks.length;
  const doneTasks = project.tasks.filter((t) => t.status === "DONE").length;

  const now = new Date();
  const overdueTasks = project.tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE",
  ).length;

  const totalMilestones = project.milestones.length;
  const doneMilestones = project.milestones.filter(
    (m) => m.status === "COMPLETED",
  ).length;

  const latestUpdateDate = project.updates[0]?.createdAt
    ? formatDate(project.updates[0].createdAt)
    : "—";

  // Days remaining / overdue calculation for About card
  const days = daysFromNow(project.endDate);
  const isPast = days < 0 && project.status !== "COMPLETED" && project.status !== "CANCELLED";

  const milestoneItems = project.milestones.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    dueDate: m.dueDate,
    status: m.status,
    completedAt: m.completedAt,
    tasksTotal: m.tasks.length,
    tasksDone: m.tasks.filter((t) => t.status === "DONE").length,
  }));

  return (
    <div className="space-y-6">
      {/* Quick stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <span className="text-xs font-medium">Tasks done</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {doneTasks}{" "}
              <span className="text-sm font-normal text-slate-400">/ {totalTasks}</span>
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <Flame className="size-4 text-red-600" />
              <span className="text-xs font-medium">Overdue tasks</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {overdueTasks}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <MilestoneIcon className="size-4 text-brand-600" />
              <span className="text-xs font-medium">Milestones</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {doneMilestones}{" "}
              <span className="text-sm font-normal text-slate-400">
                / {totalMilestones}
              </span>
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <Clock className="size-4 text-amber-600" />
              <span className="text-xs font-medium">Latest update</span>
            </div>
            <p className="mt-2 text-base font-semibold text-slate-900 truncate">
              {latestUpdateDate}
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column (2 cols wide on desktop) */}
        <div className="space-y-6 lg:col-span-2">
          {/* About Card */}
          <Card>
            <CardHeader
              title="About this project"
              action={
                access.canManage ? (
                  <Link
                    href={`/projects/${project.id}/edit`}
                    className={buttonClasses("outline", "sm")}
                  >
                    <Edit className="size-3.5" aria-hidden /> Edit project
                  </Link>
                ) : null
              }
            />
            <CardBody className="space-y-4">
              <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                {project.description?.trim() || "No description provided."}
              </p>

              <div className="grid grid-cols-1 gap-4 pt-3 border-t border-slate-100 sm:grid-cols-3 text-xs">
                <div>
                  <span className="block text-slate-400">Timeline</span>
                  <span className="mt-0.5 flex items-center gap-1 font-medium text-slate-700">
                    <Calendar className="size-3.5 text-slate-400" />
                    {formatDate(project.startDate)} → {formatDate(project.endDate)}
                  </span>
                </div>

                <div>
                  <span className="block text-slate-400">Schedule status</span>
                  <span
                    className={`mt-0.5 block font-medium ${
                      isPast
                        ? "text-red-600 font-semibold"
                        : "text-slate-700"
                    }`}
                  >
                    {isPast
                      ? `${Math.abs(days)} days overdue`
                      : days === 0
                        ? "Due today"
                        : `${days} days remaining`}
                  </span>
                </div>

                <div>
                  <span className="block text-slate-400">Planned Budget</span>
                  <span className="mt-0.5 flex items-center gap-1 font-medium text-slate-700">
                    <Coins className="size-3.5 text-slate-400" />
                    {formatINR(project.budget)}
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Milestones Card */}
          <MilestonesCard
            projectId={project.id}
            canManage={access.canManage}
            milestones={milestoneItems}
          />
        </div>

        {/* Right column (1 col wide on desktop) */}
        <div className="space-y-6 lg:col-span-1">
          <MembersCard
            projectId={project.id}
            canManage={access.canManage}
            manager={project.manager}
            members={membersWithTasks}
            availableUsers={availableUsers}
          />
        </div>
      </div>
    </div>
  );
}
