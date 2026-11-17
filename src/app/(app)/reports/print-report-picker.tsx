"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/form";

export function PrintReportPicker({ projects }: { projects: { id: string; code: string; name: string }[] }) {
  const router = useRouter();
  const [projectId, setProjectId] = useState("");

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (projectId) router.push(`/reports/${projectId}/print`);
      }}
    >
      <div className="w-full sm:w-80">
        <Label htmlFor="print-project">Project</Label>
        <Select id="print-project" value={projectId} onChange={(e) => setProjectId(e.target.value)} required>
          <option value="" disabled>
            Choose a project…
          </option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} · {p.name}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" disabled={!projectId}>
        Open report
      </Button>
    </form>
  );
}
