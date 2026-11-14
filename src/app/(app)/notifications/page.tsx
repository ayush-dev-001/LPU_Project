import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";
import { requireUser } from "@/lib/auth";

// PLACEHOLDER — owned by feature/documents-notifications-reports. Replace this whole file when building the feature.
export const metadata: Metadata = { title: "Notifications" };

export default async function Page() {
  await requireUser();
  return <ComingSoon title="Notifications" description="Alerts about your tasks and projects." />;
}
