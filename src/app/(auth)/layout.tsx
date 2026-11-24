import { BrandMark } from "@/components/layout/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <BrandMark className="size-9" />
          <span className="text-xl font-bold tracking-tight text-slate-900">ProjectPulse</span>
        </div>
        {children}
      </div>
    </main>
  );
}
