import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";
import { requireUser } from "@/lib/auth";

// PLACEHOLDER — owned by feature/updates-budget. Replace this whole file when building the feature.
export const metadata: Metadata = { title: "Updates" };

export default async function Page() {
  await requireUser();
  return <ComingSoon title="Updates" description="Latest progress updates from your projects." />;
}
