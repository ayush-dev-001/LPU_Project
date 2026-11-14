"use client";

import { useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";

/** Shows a one-time temporary password with a copy button. */
export function TempPassword({ password, forName }: { password: string; forName?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the password is still visible to copy by hand.
    }
  }

  return (
    <div role="status" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <p className="flex items-center gap-2 font-medium">
        <KeyRound className="size-4" aria-hidden />
        Temporary password{forName ? ` for ${forName}` : ""}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <code className="rounded bg-white px-2 py-1 font-mono text-base text-slate-900 ring-1 ring-amber-200">{password}</code>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium hover:bg-amber-100"
        >
          {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="mt-2 text-xs">
        This is shown only once. Share it privately; they should change it from their Profile page after signing in.
      </p>
    </div>
  );
}
