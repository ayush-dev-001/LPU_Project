"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

// Catches unexpected errors in any page inside the app, so the sidebar stays usable.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-white px-6 py-14 text-center">
      <TriangleAlert className="size-8 text-red-600" aria-hidden />
      <h2 className="mt-3 text-sm font-semibold text-slate-900">Something went wrong</h2>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        The page couldn&apos;t load. Try again; if it keeps happening, tell the team
        {error.digest ? (
          <>
            {" "}
            and quote this code: <code className="font-mono text-xs">{error.digest}</code>
          </>
        ) : null}
        .
      </p>
      <Button variant="outline" className="mt-4" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
