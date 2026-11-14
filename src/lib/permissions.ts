import "server-only";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth";
import type { Prisma } from "@/generated/prisma/client";

/*
 * Who can do what — the single source of truth. Do not re-implement these checks in pages.
 *
 *  ADMIN    → everything.
 *  MANAGER  → create projects; fully manage projects where they are the manager.
 *  MEMBER   → view projects they belong to; update tasks assigned to them;
 *             post progress updates and upload documents on their projects.
 */

/** Prisma `where` filter for the projects this user is allowed to see. */
export function visibleProjectsWhere(user: CurrentUser): Prisma.ProjectWhereInput {
  if (user.role === "ADMIN") return {};
  return {
    OR: [{ managerId: user.id }, { members: { some: { userId: user.id } } }],
  };
}

export function canCreateProject(user: CurrentUser) {
  return user.role === "ADMIN" || user.role === "MANAGER";
}

type ProjectAccess = {
  project: { id: string; managerId: string; name: string; code: string };
  canManage: boolean; // edit project, milestones, any task, budget, members
  isMember: boolean; // can contribute: updates, documents, own tasks
};

/**
 * Loads a project and checks the user can see it. Calls notFound() otherwise,
 * so a user cannot even learn that a project they have no access to exists.
 * Pass `{ manage: true }` when the action needs manager rights.
 */
export async function getProjectAccess(
  user: CurrentUser,
  projectId: string,
  opts: { manage?: boolean } = {},
): Promise<ProjectAccess> {
  const project = await db.project.findFirst({
    where: { id: projectId, ...visibleProjectsWhere(user) },
    select: {
      id: true,
      managerId: true,
      name: true,
      code: true,
      members: { where: { userId: user.id }, select: { userId: true } },
    },
  });
  if (!project) notFound();

  const canManage = user.role === "ADMIN" || project.managerId === user.id;
  if (opts.manage && !canManage) notFound();

  const { members, ...rest } = project;
  return { project: rest, canManage, isMember: canManage || members.length > 0 };
}

/** A member may change only tasks assigned to them; managers/admins may change any task. */
export function canEditTask(
  user: CurrentUser,
  access: ProjectAccess,
  task: { assigneeId: string | null },
) {
  return access.canManage || task.assigneeId === user.id;
}
