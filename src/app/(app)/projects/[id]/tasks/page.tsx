import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getProjectAccess } from "@/lib/permissions";
import { db } from "@/lib/db";
import { KanbanBoard } from "./board";
import type { Prisma } from "@/generated/prisma/client";
import type { TaskPriority } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Tasks" };

export default async function ProjectTasksPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ assignee?: string; priority?: string; milestone?: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const search = await searchParams;

  const access = await getProjectAccess(user, id);

  const project = await db.project.findUnique({
    where: { id },
    include: {
      manager: { select: { id: true, name: true, email: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      milestones: {
        select: { id: true, title: true },
        orderBy: { dueDate: "asc" },
      },
    },
  });

  if (!project) notFound();

  // Combine manager and members for assignee dropdown options
  const memberMap = new Map<string, { id: string; name: string; email: string }>();
  memberMap.set(project.manager.id, project.manager);
  for (const m of project.members) {
    memberMap.set(m.user.id, m.user);
  }
  const assigneeOptions = Array.from(memberMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  // Filters from URL
  const where: Prisma.TaskWhereInput = {
    projectId: id,
  };

  if (search.assignee === "me") {
    where.assigneeId = user.id;
  } else if (search.assignee) {
    where.assigneeId = search.assignee;
  }

  if (
    search.priority &&
    ["LOW", "MEDIUM", "HIGH", "URGENT"].includes(search.priority.toUpperCase())
  ) {
    where.priority = search.priority.toUpperCase() as TaskPriority;
  }

  if (search.milestone) {
    where.milestoneId = search.milestone;
  }

  const tasks = await db.task.findMany({
    where,
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      milestone: { select: { id: true, title: true } },
    },
    orderBy: { position: "asc" },
  });

  return (
    <div className="space-y-4">
      <KanbanBoard
        projectId={id}
        initialTasks={tasks}
        currentUser={{ id: user.id, role: user.role }}
        canManage={access.canManage}
        members={assigneeOptions}
        milestones={project.milestones}
      />
    </div>
  );
}
