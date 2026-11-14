import { Activity } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Activity className="size-5" aria-hidden />
          </span>
          <span className="text-xl font-semibold tracking-tight">ProjectPulse</span>
        </div>
        {children}
      </div>
    </main>
  );
}
