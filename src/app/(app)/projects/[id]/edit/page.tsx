import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getProjectAccess } from "@/lib/permissions";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page";
import { ProjectForm, DeleteProjectCard } from "../../project-form";
import { updateProject, deleteProject } from "../../actions";

export const metadata: Metadata = { title: "Edit Project" };

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  // Throws notFound() if user doesn't have manager rights
  await getProjectAccess(user, id, { manage: true });

  const project = await db.project.findUnique({
    where: { id },
    include: {
      members: { select: { userId: true } },
    },
  });

  if (!project) notFound();

  const allActiveUsers = await db.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });

  const eligibleManagers = allActiveUsers.filter(
    (u) => u.role === "ADMIN" || u.role === "MANAGER",
  );

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title={`Edit ${project.code}`}
        description="Update project details, timeline, budget, and assigned members."
      />

      <ProjectForm
        action={updateProject}
        initialData={{
          id: project.id,
          name: project.name,
          code: project.code,
          description: project.description,
          status: project.status,
          startDate: project.startDate,
          endDate: project.endDate,
          budget: project.budget,
          managerId: project.managerId,
          memberIds: project.members.map((m) => m.userId),
        }}
        eligibleManagers={eligibleManagers}
        eligibleMembers={allActiveUsers}
        currentUser={user}
      />

      <DeleteProjectCard
        projectId={project.id}
        projectCode={project.code}
        deleteAction={deleteProject}
      />
    </div>
  );
}
