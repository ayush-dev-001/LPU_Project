import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";
import { requireUser } from "@/lib/auth";

// PLACEHOLDER — owned by feature/projects-milestones. Replace this whole file when building the feature.
export const metadata: Metadata = { title: "Projects" };

export default async function Page() {
  await requireUser();
  return <ComingSoon title="Projects" description="All projects you manage or belong to." />;
}
