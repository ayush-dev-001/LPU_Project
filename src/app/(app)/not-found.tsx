import Link from "next/link";
import { SearchX } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/page";

// Shown inside the app layout when a page calls notFound() — e.g. a project
// that doesn't exist or that the user isn't allowed to see.
export default function NotFound() {
  return (
    <EmptyState
      icon={SearchX}
      title="Not found"
      description="This page doesn't exist, or you don't have access to it."
      action={
        <Link href="/dashboard" className={buttonClasses("outline")}>
          Back to dashboard
        </Link>
      }
    />
  );
}
