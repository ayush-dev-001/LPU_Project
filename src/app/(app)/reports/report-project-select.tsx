"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/form";

export function ProjectReportSelect({ projects }: { projects: { id: string; code: string; name: string }[] }) {
  const router = useRouter();
  return (
    <div className="w-full sm:max-w-lg">
      <label htmlFor="printProjectId" className="mb-1.5 block text-sm font-medium text-slate-700">Project</label>
      <Select
        id="printProjectId"
        name="printProjectId"
        defaultValue=""
        onChange={(event) => {
          if (event.currentTarget.value) router.push(`/reports/${encodeURIComponent(event.currentTarget.value)}/print`);
        }}
      >
        <option value="">Select a project</option>
        {projects.map((project) => <option key={project.id} value={project.id}>{project.code} · {project.name}</option>)}
      </Select>
    </div>
  );
}
