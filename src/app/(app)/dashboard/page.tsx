import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";
import { requireUser } from "@/lib/auth";

// PLACEHOLDER — owned by feature/dashboard. Replace this whole file when building the feature.
export const metadata: Metadata = { title: "Dashboard" };

export default async function Page() {
  await requireUser();
  return <ComingSoon title="Dashboard" description="Health of every project at a glance." />;
}
