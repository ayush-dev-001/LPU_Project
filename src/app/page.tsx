import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  BellRing,
  Check,
  FileBarChart,
  FileDown,
  FolderKanban,
  GanttChart,
  LayoutDashboard,
  ListChecks,
  MousePointer2,
  Plus,
  ShieldCheck,
  Square,
  Type,
  Users,
  Wallet,
} from "lucide-react";
import { BrandMark } from "@/components/layout/brand";
import { HeroDemo } from "@/components/landing/hero-demo";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: { absolute: "ProjectPulse · Every project, every role, one place" },
  description:
    "ProjectPulse brings tasks, milestones, budgets, documents and team updates together and scores each project's health, so you see what is slipping before it is late.",
};

// Signed-in visitors never see this page: the proxy sends them to /dashboard.
export default function LandingPage() {
  return (
    <div className="mx-auto max-w-[1280px] px-3 py-3 sm:px-5 sm:py-5">
      <div className="space-y-3 sm:space-y-5">
        <Hero />
        <Features />
        <Split />
        <Roles />
        <News />
        <Footer />
      </div>
    </div>
  );
}

/* ───────────────────────────── Shared bits ───────────────────────────── */

function Panel({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return <section className={cn("overflow-hidden rounded-[28px] bg-black", className)} {...props} />;
}

function PillLink({
  href,
  children,
  tone = "light",
  className,
}: {
  href: string;
  children: React.ReactNode;
  tone?: "light" | "dark" | "blue";
  className?: string;
}) {
  const tones = {
    light: "bg-[#f6f5f4] text-ink hover:bg-white",
    dark: "bg-[#1c1c20] text-[#f6f5f4] hover:bg-[#26262b]",
    blue: "bg-[#2f7cf6] text-on-color hover:bg-[#2a6fe0]",
  };
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-5 text-sm font-medium transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f7cf6]",
        tones[tone],
        className,
      )}
    >
      {children}
    </Link>
  );
}

function WindowDots() {
  return (
    <span className="flex gap-1.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-2.5 rounded-full border border-slate-400/60" />
      ))}
    </span>
  );
}

function Avatar({ text, className }: { text: string; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-7 items-center justify-center rounded-full text-[10px] font-semibold text-ink ring-2 ring-black",
        className,
      )}
      aria-hidden
    >
      {text}
    </span>
  );
}

/* ───────────────────────────── 1. Hero ───────────────────────────── */

function Hero() {
  return (
    <Panel className="relative px-4 pb-0 pt-4 sm:px-6 sm:pt-5">
      {/* Top navigation */}
      <header className="flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5" aria-label="ProjectPulse home">
          <BrandMark className="size-8" />
          <span className="hidden text-lg font-medium tracking-tight text-slate-900 sm:block">ProjectPulse</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm md:flex" aria-label="Landing">
          <a href="#features" className="text-slate-900">
            Product
          </a>
          <a href="#roles" className="text-slate-500 hover:text-slate-900">
            Roles
          </a>
          <a href="#news" className="text-slate-500 hover:text-slate-900">
            What&apos;s new
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/register" className="hidden px-3 text-sm text-slate-500 hover:text-slate-900 sm:block">
            Create account
          </Link>
          <PillLink href="/login">Sign in</PillLink>
        </div>
      </header>

      {/* The "app window" that frames the hero, as in the design */}
      <div className="mt-5 rounded-t-[22px] border border-b-0 border-[#232327] bg-[#0d0d0f]">
        <div className="flex items-center justify-between px-4 py-3">
          <WindowDots />
          <div className="hidden items-center gap-2 sm:flex" aria-hidden>
            {[Type, LayoutDashboard, MousePointer2, Square, Plus].map((Icon, i) => (
              <span key={i} className="flex size-8 items-center justify-center rounded-lg bg-[#1c1c20] text-slate-600">
                <Icon className="size-4" />
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-[#2f7cf6] px-3 py-1 text-xs font-medium text-on-color">Live</span>
            <span className="flex -space-x-2">
              <Avatar text="AD" className="bg-sand" />
              <Avatar text="PS" className="bg-lilac" />
            </span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-t-[18px] border-t border-[#1d1d21] bg-gradient-to-b from-[#121215] to-black px-4 pb-0 pt-14 sm:px-10 sm:pt-20">
          {/* Faint diagonal light, like the design's background */}
          <div
            className="pointer-events-none absolute -right-40 top-0 h-[520px] w-[720px] rotate-[24deg] bg-gradient-to-b from-white/[0.05] to-transparent"
            aria-hidden
          />

          <div className="relative mx-auto max-w-3xl text-center">
            <h1 className="display text-[2.6rem] text-slate-900 sm:text-6xl lg:text-7xl">
              The easiest way to keep every project on track.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-slate-600 sm:text-lg">
              ProjectPulse brings tasks, milestones, budgets and team updates together, and scores each
              project&apos;s health so you see what is slipping before it is late.
            </p>
          </div>

          <HeroDemo />
        </div>
      </div>
    </Panel>
  );
}

/* ───────────────────────────── 2. Features + facts ───────────────────────────── */

function Features() {
  return (
    <Panel id="features" className="px-5 py-14 sm:px-16 sm:py-20">
      <PillLink href="/register">Create your account</PillLink>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl bg-[#141416] p-6 text-center">
          <h2 className="display text-3xl text-slate-900">A board for every project</h2>
          <p className="mx-auto mt-4 max-w-xs text-sm text-slate-500">
            Plan tasks and milestones, drag work across the board, and see it all on a timeline.
          </p>
          <ul className="mt-6 space-y-1 rounded-2xl bg-[#0f0f11] p-3 text-left text-sm">
            {[
              { icon: ListChecks, label: "To do", active: true },
              { icon: FolderKanban, label: "In progress" },
              { icon: Check, label: "Done" },
            ].map(({ icon: Icon, label, active }) => (
              <li
                key={label}
                className={cn("flex items-center gap-3 rounded-xl px-3 py-2", active ? "bg-[#1c1c20] text-slate-900" : "text-slate-600")}
              >
                <span className={cn("flex size-7 items-center justify-center rounded-lg", active ? "bg-[#f6f5f4] text-ink" : "bg-[#1c1c20]")}>
                  <Icon className="size-4" aria-hidden />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl bg-[#141416] p-6 text-center">
          <h2 className="display text-3xl text-slate-900">Updates that surface blockers</h2>
          <p className="mx-auto mt-4 max-w-xs text-sm text-slate-500">
            Members post what they did and what is in the way. The manager is told the moment a blocker appears.
          </p>
          <div className="mt-6 flex justify-center gap-1.5 text-[10px] text-slate-600" aria-hidden>
            {["Done", "Blocker", "60%"].map((t) => (
              <span key={t} className="rounded-md bg-[#1f1f23] px-2 py-0.5">
                {t}
              </span>
            ))}
          </div>
          <div className="relative mx-auto mt-3 max-w-[220px] rounded-2xl bg-[#0f0f11] p-4 text-left">
            <span className="absolute -right-3 top-3 rounded-lg bg-[#f6f5f4] px-2.5 py-1 text-xs font-medium text-ink">
              Notify manager
            </span>
            <p className="text-xs text-slate-500">Aman Gupta · today</p>
            <p className="mt-2 text-sm text-slate-900">Readers installed on floor 1.</p>
            <p className="mt-2 rounded-lg bg-red-50 px-2 py-1 text-xs text-red-700">Blocked: waiting for network ports</p>
            <div className="mt-3 h-1.5 rounded-full bg-[#1f1f23]">
              <div className="h-1.5 w-3/5 rounded-full bg-lilac" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-sand p-6 text-ink">
          <div className="flex justify-between text-sm text-ink/60">
            <span>Know early</span>
            <span aria-hidden>•••</span>
          </div>
          <h2 className="display mt-2 text-3xl">A health score for every project</h2>
          <div className="mt-6 flex h-28 items-end gap-2" aria-hidden>
            {[40, 22, 70, 35, 95, 30].map((h, i) => (
              <div key={i} className="relative flex-1" style={{ height: `${h}%` }}>
                <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,rgb(11_11_12/0.12)_0_2px,transparent_2px_6px)]" />
                <div className="absolute inset-x-0 top-0 h-1 bg-ink" />
              </div>
            ))}
          </div>
          <p className="mt-4 flex items-baseline gap-2">
            <span className="display text-4xl">0–100</span>
            <span className="text-sm text-ink/70">with the reasons</span>
          </p>
        </div>
      </div>

      <div className="mt-16 grid items-center gap-10 md:grid-cols-[1fr_1fr_1.6fr]">
        <Fact value="6" label="signals in every health score: schedule, deadlines, budget, milestones, blockers, silence" />
        <Fact value="3" label="roles, each seeing only what it should: Admin, Manager and Member" />
        <div className="relative rounded-3xl bg-[#141416] p-7">
          <p className="display text-3xl text-slate-900 sm:text-4xl">
            We help teams spot <mark className="bg-[#f6f5f4] px-1 text-ink">slipping projects</mark> early
          </p>
          <span className="absolute -bottom-3 right-6 rounded-md bg-[#2f7cf6] px-2 py-0.5 text-xs text-on-color">Manager</span>
        </div>
      </div>
    </Panel>
  );
}

function Fact({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="display text-6xl text-slate-900">{value}</p>
      <p className="mx-auto mt-3 max-w-[16rem] text-base text-slate-500">{label}</p>
    </div>
  );
}

/* ───────────────────────────── 3. Split ───────────────────────────── */

function Split() {
  return (
    <Panel className="px-5 py-14 sm:px-16 sm:py-20">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <h2 className="display text-5xl text-slate-900 sm:text-6xl">Made for managers, easy for members</h2>
          <p className="mt-6 max-w-md text-lg text-slate-500">
            Managers get the numbers and the reasons behind them. Members get a clear list of what to do next.
          </p>
          <div className="mt-8 flex gap-2">
            <PillLink href="/login">Sign in</PillLink>
            <PillLink href="#roles" tone="dark">
              See roles
            </PillLink>
          </div>
        </div>

        <div className="rounded-3xl border border-[#232327] bg-[#0f0f11] p-3">
          <div className="flex items-center justify-between px-2 py-1.5">
            <WindowDots />
            <span className="rounded-lg bg-[#f6f5f4] px-3 py-1 text-xs font-medium text-ink">Print report</span>
          </div>
          <div className="mt-2 rounded-2xl border border-[#1d1d21] bg-gradient-to-br from-[#161619] to-black p-6 sm:p-8">
            <p className="display text-3xl text-slate-900 sm:text-4xl">Why PRJ-002 is off track</p>
            <ul className="mt-5 space-y-1.5 font-mono text-sm text-slate-600">
              <li>score: 16 / 100;</li>
              <li>behind-schedule: −35;</li>
              <li className="text-slate-500">{"/* 29% done, 89% of the time used */"}</li>
              <li>overdue-tasks: −16;</li>
              <li>spending-ahead-of-progress: −15;</li>
              <li className="text-slate-500">
                missed-milestones: …<span className="animate-pulse">|</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-12 grid gap-3 sm:grid-cols-[1.2fr_1fr_1.4fr]">
        <Chip icon={Users} tone="sand">
          Managers and admins
        </Chip>
        <Chip icon={FileDown}>Export to CSV</Chip>
        <Chip icon={FileBarChart} tone="lilac">
          Printable status reports
        </Chip>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1.5fr_1.1fr]">
        <Chip icon={Users}>Members</Chip>
        <Chip icon={GanttChart}>Kanban board and timeline</Chip>
        <Chip icon={Wallet} tone="mint">
          Budget alerts
        </Chip>
      </div>
    </Panel>
  );
}

function Chip({
  icon: Icon,
  tone,
  children,
}: {
  icon: typeof Users;
  tone?: "sand" | "lilac" | "mint";
  children: React.ReactNode;
}) {
  const bg = { sand: "bg-sand text-ink", lilac: "bg-lilac text-ink", mint: "bg-mint text-ink" };
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl px-5 py-4 text-lg tracking-tight",
        tone ? bg[tone] : "bg-[#141416] text-slate-900",
      )}
    >
      <span className={cn("flex size-8 items-center justify-center rounded-lg", tone ? "bg-ink/10" : "bg-[#1f1f23]")}>
        <Icon className="size-4" aria-hidden />
      </span>
      {children}
    </div>
  );
}

/* ───────────────────────────── 4. Roles (in place of pricing) ───────────────────────────── */

const ROLES = [
  {
    name: "Admin",
    tagline: "Runs the workspace",
    summary: "Adds people, sets roles and sees every project in the organisation.",
    can: ["Add users and reset passwords", "Change roles, deactivate accounts", "See every project and report", "Run deadline alerts on demand"],
  },
  {
    name: "Manager",
    tagline: "Owns the projects",
    summary: "Plans the work, tracks money and gets warned before a project slips.",
    can: ["Create projects and milestones", "Assign tasks on the board", "Record expenses, get budget alerts", "Print status reports, export CSV"],
  },
  {
    name: "Member",
    tagline: "Does the work",
    summary: "Sees exactly what is assigned and reports progress in seconds.",
    can: ["My tasks across all projects", "Move tasks through the board", "Post updates and flag blockers", "Share documents with the team"],
  },
];

function Roles() {
  return (
    <Panel id="roles" className="p-3 sm:p-4">
      <div className="rounded-[22px] bg-sand px-5 py-12 text-ink sm:px-14 sm:py-16">
        <h2 className="display text-center text-5xl">One app, three roles</h2>
        <div className="mt-12 grid gap-10 md:grid-cols-3">
          {ROLES.map((role) => (
            <div key={role.name} className="flex flex-col">
              <p className="flex items-baseline gap-3">
                <span className="display text-4xl">{role.name}</span>
                <span className="text-sm text-ink/60">/ {role.tagline}</span>
              </p>
              <p className="mt-4 min-h-12 text-base">{role.summary}</p>
              <hr className="my-6 border-ink/15" />
              <ul className="flex-1 space-y-3 text-base">
                {role.can.map((c) => (
                  <li key={c} className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-ink text-sand">
                      <Check className="size-3" aria-hidden />
                    </span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-12 grid max-w-xl gap-3 sm:grid-cols-2">
          <Link href="/register" className="rounded-xl bg-ink py-3 text-center text-sm font-medium text-sand hover:bg-black">
            Get started
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-ink/30 py-3 text-center text-sm font-medium text-ink hover:bg-ink/5"
          >
            Sign in
          </Link>
        </div>
        <hr className="mx-auto mt-12 max-w-4xl border-ink/15" />
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm text-ink/70">
          <span className="text-lg text-ink">Built with</span>
          <span>Next.js</span>
          <span>PostgreSQL</span>
          <span>Prisma</span>
          <span>Tailwind CSS</span>
        </div>
      </div>
    </Panel>
  );
}

/* ───────────────────────────── 5. What's new ───────────────────────────── */

function News() {
  return (
    <Panel id="news" className="px-5 py-14 sm:px-16 sm:py-20">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <h2 className="display text-5xl text-slate-900">ProjectPulse updates and news</h2>
          <p className="mt-5 text-lg text-slate-500">
            The latest release adds safer document storage, automatic deadline alerts and one-click printable
            reports.
          </p>
        </div>
        <PillLink href="/register">I want to try it</PillLink>
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="overflow-hidden rounded-3xl bg-[#141416]">
          <div className="flex items-center justify-between border-b border-[#1d1d21] px-4 py-3">
            <span className="flex gap-1.5 text-slate-500" aria-hidden>
              {[Type, LayoutDashboard, MousePointer2].map((Icon, i) => (
                <span key={i} className="flex size-7 items-center justify-center rounded-md bg-[#1c1c20]">
                  <Icon className="size-3.5" />
                </span>
              ))}
            </span>
            <span className="rounded-md bg-[#2f7cf6] px-2.5 py-0.5 text-xs text-on-color">New</span>
          </div>
          <div className="grid grid-cols-[1.3fr_1fr] gap-3 p-4">
            <div className="rounded-2xl bg-gradient-to-br from-lilac to-sand p-4 text-ink">
              <p className="text-xs text-ink/60">Documents</p>
              <p className="mt-6 text-lg leading-tight tracking-tight">Site-survey.pdf</p>
              <p className="text-xs text-ink/60">2.1 MB · Aman</p>
            </div>
            <ul className="space-y-1.5 text-xs">
              <li className="flex items-center gap-2 rounded-lg bg-[#2f7cf6] px-2 py-1.5 text-on-color">
                <ShieldCheck className="size-3.5" aria-hidden /> Private
              </li>
              <li className="flex items-center gap-2 rounded-lg bg-[#1c1c20] px-2 py-1.5 text-slate-600">
                <BellRing className="size-3.5" aria-hidden /> Alerts
              </li>
              <li className="flex items-center gap-2 rounded-lg bg-[#1c1c20] px-2 py-1.5 text-slate-600">
                <FileBarChart className="size-3.5" aria-hidden /> Reports
              </li>
            </ul>
          </div>
          <div className="px-6 pb-6">
            <p className="display text-3xl text-slate-900">Documents now kept safe in the cloud</p>
            <p className="mt-3 text-sm text-slate-500">
              Files you upload stay private to the project. Only people on that project can download them.
            </p>
          </div>
        </div>

        <div>
          <div className="flex items-start justify-between gap-4">
            <h3 className="display text-3xl text-slate-900">Announcement</h3>
            <ArrowUpRight className="size-6 shrink-0 text-slate-900" aria-hidden />
          </div>
          <div className="mt-5 space-y-5 text-lg">
            <p className="text-slate-700">
              Deadline alerts now run every morning. Assignees hear about tasks due in the next two days, and managers
              about milestones due in three.
            </p>
            <p className="text-slate-600">
              Managers can print a one-page status report for any project, with its health score, the reasons behind
              it, budget, milestones and recent updates.
            </p>
            <p className="bg-gradient-to-b from-slate-500 to-transparent bg-clip-text text-transparent">
              Also new: CSV exports for projects, tasks and expenses; a redesigned dashboard with weekly activity and
              upcoming deadlines; and a timeline view for every project.
            </p>
          </div>
        </div>
      </div>
    </Panel>
  );
}

/* ───────────────────────────── 6. Footer ───────────────────────────── */

function Footer() {
  return (
    <Panel className="px-5 py-12 sm:px-12 sm:py-16">
      <div className="grid gap-10 md:grid-cols-[1.2fr_1fr_1fr]">
        <Link href="/" className="flex items-center gap-3 self-start">
          <BrandMark className="size-9" />
          <span className="text-2xl tracking-tight text-slate-900">ProjectPulse</span>
        </Link>
        <ul className="space-y-2.5 text-sm text-slate-800">
          <li>
            <a href="#features" className="hover:text-slate-900 hover:underline">
              Product
            </a>
          </li>
          <li>
            <a href="#roles" className="hover:text-slate-900 hover:underline">
              Roles
            </a>
          </li>
          <li>
            <a href="#news" className="hover:text-slate-900 hover:underline">
              What&apos;s new
            </a>
          </li>
        </ul>
        <ul className="space-y-2.5 text-sm text-slate-800">
          <li>
            <Link href="/login" className="hover:text-slate-900 hover:underline">
              Sign in
            </Link>
          </li>
          <li>
            <Link href="/register" className="hover:text-slate-900 hover:underline">
              Create account
            </Link>
          </li>
          <li>
            <a
              href="https://github.com/ayush-dev-001/LPU_Project"
              className="hover:text-slate-900 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Source code
            </a>
          </li>
        </ul>
      </div>
      <div className="mt-16 grid gap-6 md:grid-cols-[1.2fr_2fr]">
        <p className="text-xs text-slate-500">ProjectPulse · {new Date().getFullYear()}</p>
        <p className="text-xs leading-relaxed text-slate-500">
          ProjectPulse is a web-based integrated project monitoring platform built as an LPU team project. Passwords
          are stored as one-way hashes, every action is checked on the server, and documents are visible only to the
          people on their project.
        </p>
      </div>
    </Panel>
  );
}
