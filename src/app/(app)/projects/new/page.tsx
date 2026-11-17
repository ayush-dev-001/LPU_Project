import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { canCreateProject } from "@/lib/permissions";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page";
import { ProjectForm } from "../project-form";
import { createProject } from "../actions";

export const metadata: Metadata = { title: "New Project" };

export default async function NewProjectPage() {
  const user = await requireUser();
  if (!canCreateProject(user)) {
    redirect("/projects");
  }

  // Find next free code: PRJ-001, PRJ-002 -> PRJ-005
  const projects = await db.project.findMany({
    select: { code: true },
  });

  let maxNum = 0;
  for (const p of projects) {
    const match = p.code.match(/^PRJ-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1]!, 10);
      if (num > maxNum) maxNum = num;
    }
  }
  const nextCode = `PRJ-${String(maxNum + 1).padStart(3, "0")}`;

  const allActiveUsers = await db.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });

  const eligibleManagers = allActiveUsers.filter(
    (u) => u.role === "ADMIN" || u.role === "MANAGER",
  );

  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 30);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="New project"
        description="Create a project, define timeline and budget, and assign your team."
      />

      <ProjectForm
        action={createProject}
        initialData={{
          name: "",
          code: nextCode,
          description: "",
          status: "PLANNING",
          startDate,
          endDate,
          budget: 0,
          managerId: user.role === "ADMIN" ? (eligibleManagers[0]?.id ?? user.id) : user.id,
          memberIds: [],
        }}
        eligibleManagers={eligibleManagers}
        eligibleMembers={allActiveUsers}
        currentUser={user}
      />
    </div>
  );
}
