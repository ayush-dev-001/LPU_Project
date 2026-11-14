import { Construction } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui/page";

/** Temporary placeholder for pages still being built. Replace the whole page file when you build it. */
export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <EmptyState icon={Construction} title="Being built" description="This section is under development." />
    </>
  );
}
