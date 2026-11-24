import Link from "next/link";
import { Activity } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";

// For URLs that match no route at all.
export default function GlobalNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <span className="flex size-10 items-center justify-center rounded-lg bg-brand-600 text-on-color">
        <Activity className="size-5" aria-hidden />
      </span>
      <p className="mt-6 font-mono text-sm text-slate-500">404</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">The link may be broken, or the page may have moved.</p>
      <Link href="/dashboard" className={buttonClasses("primary", "md", "mt-6")}>
        Go to dashboard
      </Link>
    </main>
  );
}
