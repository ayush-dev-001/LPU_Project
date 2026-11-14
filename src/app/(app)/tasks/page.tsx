import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";
import { requireUser } from "@/lib/auth";

// PLACEHOLDER — owned by feature/tasks-board. Replace this whole file when building the feature.
export const metadata: Metadata = { title: "My tasks" };

export default async function Page() {
  await requireUser();
  return <ComingSoon title="My tasks" description="Everything assigned to you, across projects." />;
}
