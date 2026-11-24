import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  FileBarChart,
  FileDown,
  FolderLock,
  GanttChart,
  Gauge,
  KanbanSquare,
  MessageSquareWarning,
  Plus,
  Wallet,
} from "lucide-react";
import { BackToTop } from "@/components/landing/back-to-top";
import { LivePreview } from "@/components/landing/live-preview";
import { ReportPanel } from "@/components/landing/report-panel";
import { Reveal } from "@/components/landing/reveal";
import { RoleTabs } from "@/components/landing/role-tabs";
import { NAV } from "@/components/landing/nav";
import { SiteHeader, Wordmark } from "@/components/landing/site-header";

export const metadata: Metadata = {
  title: { absolute: "ProjectPulse · Every project, every role, one place" },
  description:
    "ProjectPulse brings tasks, milestones, budgets, documents and team updates together and scores each project's health, so you see what is slipping before it is late.",
};

// The public home page. Signed-in visitors never see it: the proxy sends them to /dashboard.
// Section ids are the header's and footer's link targets.
export default function LandingPage() {
  return (
    <div className="relative min-h-dvh bg-ink">
      <SiteHeader />
      <main>
        <div className="relative overflow-hidden">
          {/* Decoration: a dot grid fading out, a mint glow behind the preview, two sparkles. */}
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.07)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_70%_55%_at_50%_20%,#000,transparent)]" />
            <div className="absolute left-1/2 top-[45%] h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-mint/[0.10] blur-[140px]" />
          </div>
          <div className="hidden md:block">
            <Sparkle className="left-[7%] top-[11%] size-20" />
            <Sparkle className="right-[9%] top-[24%] size-24" />
          </div>
          <Hero />
          <StackRow />
        </div>
        <Product />
        <HowItWorks />
        <Roles />
        <Reports />
        <Faq />
      </main>
      <Footer />
    </div>
  );
}

/* ───────────────────────────── Shared bits ───────────────────────────── */

/** A soft mint cross of light. */
function Sparkle({ className }: { className: string }) {
  return (
    <div className={`pointer-events-none absolute ${className}`} aria-hidden>
      <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-gradient-to-r from-transparent via-mint/60 to-transparent" />
      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-mint/60 to-transparent" />
    </div>
  );
}

/** A small mono label above a section heading. */
function Eyebrow({ children, dark = true }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <p
      className={`inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.08em] ${
        dark ? "text-mint" : "text-ink/60"
      }`}
    >
      <span className={`h-px w-6 ${dark ? "bg-mint/60" : "bg-ink/30"}`} aria-hidden />
      {children}
    </p>
  );
}

const heading = "text-[clamp(2.1rem,4.2vw,3.6rem)] font-bold leading-[1.02] tracking-[-0.05em]";
const primaryButton =
  "inline-flex h-12 items-center gap-2 rounded-[10px] bg-mint px-5 text-lg font-semibold text-ink transition-[filter,transform] hover:brightness-110 active:translate-y-px";
const ghostButton =
  "inline-flex h-12 items-center gap-2 rounded-[10px] border border-paper/12 bg-paper/[0.04] px-5 text-lg font-semibold text-paper transition-colors hover:bg-paper/[0.08]";

/* ───────────────────────────── Hero ───────────────────────────── */

function Hero() {
  return (
    <section className="relative z-10 px-4 pb-20 pt-32 lg:pt-36">
      <div className="mx-auto max-w-[1080px] text-center">
        <Reveal>
          <a
            href="#how"
            className="inline-flex items-center gap-2 rounded-full border border-paper/10 bg-paper/[0.04] py-1 pl-1 pr-3.5 text-[13.5px] text-paper/80 transition-colors hover:bg-paper/[0.08]"
          >
            <span className="shrink-0 whitespace-nowrap rounded-full bg-mint/15 px-2.5 py-0.5 font-mono text-[11.5px] text-mint">0–100</span>
            A health score for every project, with the reasons
            <ArrowRight className="size-3.5" aria-hidden />
          </a>
        </Reveal>
        <Reveal delay={60}>
          <h1 className="mx-auto mt-8 max-w-[900px] text-[clamp(2.4rem,6vw,4.9rem)] font-bold leading-[0.98] tracking-[-0.05em] text-paper">
            See Which Projects <span className="text-paper/35">Are</span>{" "}
            <span className="relative whitespace-nowrap">
              Slipping
              <svg
                viewBox="0 0 300 12"
                preserveAspectRatio="none"
                className="absolute -bottom-2 left-0 h-3 w-full text-mint"
                aria-hidden
              >
                <path d="M2 9C60 3 180 1 298 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </span>{" "}
            <span className="text-paper/35">Before They&apos;re</span> Late
          </h1>
        </Reveal>
        <Reveal delay={120}>
          <p className="mx-auto mt-8 max-w-[560px] text-lg leading-relaxed text-paper/60">
            Tasks, milestones, budgets, documents and team updates in one place. ProjectPulse scores each
            project&apos;s health from all of them, so managers act early and members just do the work.
          </p>
        </Reveal>
        <Reveal delay={180} className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link href="/register" className={primaryButton}>
            Get started free
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <a href="#demo" className={ghostButton}>
            Try the preview
          </a>
        </Reveal>
      </div>

      <Reveal delay={260} className="mx-auto mt-16 max-w-[1080px]">
        <LivePreview />
      </Reveal>
    </section>
  );
}

const STACK = ["Next.js", "React", "TypeScript", "PostgreSQL", "Prisma", "Tailwind CSS", "Vercel"];

function StackRow() {
  return (
    <div className="relative z-10 mx-auto max-w-[1080px] px-4 pb-20">
      <div className="flex flex-col items-center gap-5 border-t border-paper/[0.07] pt-10 md:flex-row md:justify-between">
        <p className="shrink-0 font-mono text-[12px] uppercase tracking-[0.08em] text-paper/40">Built with</p>
        <ul className="flex flex-wrap justify-center gap-x-7 gap-y-3 md:justify-end">
          {STACK.map((label) => (
            <li key={label} className="text-[15px] font-semibold tracking-[-0.01em] text-paper/50">
              {label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ───────────────────────────── Product bento ───────────────────────────── */

const tile = "relative overflow-hidden rounded-[20px] border border-paper/[0.07] bg-[#121214] p-6 sm:p-7";

function TileHeading({ icon: Icon, title, body }: { icon: typeof Gauge; title: string; body: string }) {
  return (
    <>
      <span className="grid size-10 place-items-center rounded-[10px] bg-paper/[0.06] text-mint">
        <Icon className="size-5 stroke-[1.7]" aria-hidden />
      </span>
      <h3 className="mt-5 text-[22px] font-semibold leading-tight tracking-[-0.025em] text-paper">{title}</h3>
      <p className="mt-2 max-w-[380px] text-[15px] leading-snug text-paper/55">{body}</p>
    </>
  );
}

const COLUMNS = [
  { name: "To do", cards: ["Install card readers", "Train office staff"] },
  { name: "In progress", cards: ["Run network cabling"] },
  { name: "Done", cards: ["Site survey"] },
];

function Product() {
  return (
    <section id="product" aria-labelledby="product-title" className="scroll-mt-20 bg-ink py-24 text-paper lg:py-32">
      <div className="mx-auto max-w-[1080px] px-4">
        <Reveal className="max-w-[640px]">
          <Eyebrow>Product</Eyebrow>
          <h2 id="product-title" className={`mt-5 ${heading}`}>
            Everything a Project Needs, in One Place
          </h2>
          <p className="mt-5 text-lg leading-snug text-paper/55">
            Plan the work, track the money, hear about problems early, and hand the client a report when they ask.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Reveal className="md:col-span-2">
            <div className={`${tile} h-full`}>
              <TileHeading
                icon={KanbanSquare}
                title="A Board for Every Project"
                body="Drag tasks from To do to Done. Members see their own work across every project on My tasks."
              />
              <div className="mt-7 grid grid-cols-3 gap-2 text-[12.5px]" aria-hidden>
                {COLUMNS.map((col) => (
                  <div key={col.name} className="min-w-0 rounded-xl bg-black/30 p-2.5">
                    <p className="px-1 text-paper/45">{col.name}</p>
                    <div className="mt-2 space-y-1.5">
                      {col.cards.map((c) => (
                        <p key={c} className="truncate rounded-lg border border-paper/10 bg-paper/[0.04] px-2.5 py-2 text-paper/85">
                          {c}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={60}>
            <div className={`${tile} flex h-full flex-col border-mint/20 bg-mint text-ink`}>
              <Gauge className="size-7 stroke-[1.7]" aria-hidden />
              <p className="mt-auto pt-10 text-[64px] font-semibold leading-none tracking-[-0.06em]">
                6<span className="ml-2 text-[28px] tracking-[-0.03em]">signals</span>
              </p>
              <p className="mt-3 text-[15px] leading-snug text-ink/70">
                Schedule, deadlines, budget, milestones, blockers and silence, rolled into one health score.
              </p>
            </div>
          </Reveal>

          <Reveal>
            <div className={`${tile} h-full`}>
              <TileHeading
                icon={MessageSquareWarning}
                title="Updates That Surface Blockers"
                body="Members post progress in seconds and flag anything in the way. Managers hear about it at once."
              />
              <div className="mt-7 flex items-center gap-3 rounded-xl border border-[#f0a070]/25 bg-[#f0a070]/[0.08] p-3" aria-hidden>
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#f0a070] text-ink">
                  <MessageSquareWarning className="size-4" />
                </span>
                <span className="text-[13px] text-paper/80">Blocked: waiting for network ports</span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={60}>
            <div className={`${tile} h-full`}>
              <TileHeading
                icon={Wallet}
                title="Budgets That Warn You"
                body="Record expenses as they happen. Managers and admins are notified at 80% and again at 100%."
              />
              <div className="mt-6" aria-hidden>
                <div className="flex justify-between text-[12.5px] text-paper/55">
                  <span>₹2,40,000 of ₹3,00,000</span>
                  <span className="text-paper">80%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-paper/10">
                  <div className="h-2 w-4/5 rounded-full bg-mint" />
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className={`${tile} h-full`}>
              <TileHeading
                icon={BellRing}
                title="Deadline Alerts"
                body="Every morning, assignees hear about tasks due in the next two days, and managers about overdue ones."
              />
              <div className="mt-6 flex gap-2 text-[12.5px]" aria-hidden>
                <span className="rounded-full bg-mint/12 px-3 py-1 text-mint">Due in 2 days</span>
                <span className="rounded-full bg-[#f0a070]/15 px-3 py-1 text-[#f0a070]">Overdue</span>
              </div>
            </div>
          </Reveal>

          <Reveal>
            <div className={`${tile} h-full`}>
              <TileHeading
                icon={GanttChart}
                title="Milestones and a Timeline"
                body="Set the milestones that matter and see every task and deadline laid out against today."
              />
              <div className="relative mt-8 h-12" aria-hidden>
                <div className="absolute inset-x-0 top-1/2 h-px bg-paper/15" />
                {[12, 45, 80].map((left, i) => (
                  <span
                    key={left}
                    className={`absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[3px] ${
                      i < 2 ? "bg-mint" : "border border-paper/40 bg-ink"
                    }`}
                    style={{ left: `${left}%` }}
                  />
                ))}
                <span className="absolute left-[62%] top-0 h-full w-px bg-lilac" />
                <span className="absolute left-[62%] top-0 -translate-x-1/2 -translate-y-4 rounded bg-lilac px-1.5 text-[10px] font-semibold text-ink">
                  Today
                </span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={60} className="md:col-span-2">
            <div className="relative h-full min-h-[240px] overflow-hidden rounded-[20px] bg-lilac p-7 text-ink sm:p-8">
              <div
                className="pointer-events-none absolute -bottom-24 -right-10 size-[320px] rounded-full border-[40px] border-ink/[0.06]"
                aria-hidden
              />
              <FolderLock className="size-7 stroke-[1.7]" aria-hidden />
              <div className="relative mt-10 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="max-w-[420px] text-[22px] font-semibold leading-tight tracking-[-0.025em]">
                    Documents kept with the project they belong to.
                  </p>
                  <p className="mt-2 max-w-[420px] text-[15px] leading-snug text-ink/65">
                    Plans, invoices and site photos, stored privately and visible only to the project&apos;s team.
                  </p>
                </div>
                <Link
                  href="/register"
                  className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-ink px-4 text-[15px] font-semibold text-paper transition-colors hover:bg-black"
                >
                  Try it
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── How it works (light ground) ───────────────────────────── */

const STEPS = [
  {
    title: "Create a project",
    body: "Set the dates, the budget and the team. Add milestones for the moments that matter.",
    sample: "PRJ-002 · 01 Oct → 15 Dec",
  },
  {
    title: "Run the work",
    body: "Assign tasks on the board, record expenses, and let members post updates as they go.",
    sample: "Run network cabling → In progress",
  },
  {
    title: "Act on the score",
    body: "The health score drops when something slips and tells you why, so you fix it before it is late.",
    sample: "On track → At risk: 2 overdue tasks",
  },
];

const STATS = [
  { value: "3", label: "roles, each seeing only what it should" },
  { value: "80%", label: "of budget used before the first warning" },
  { value: "14", label: "days of silence before a project loses points" },
];

function HowItWorks() {
  return (
    <section id="how" aria-labelledby="how-title" className="scroll-mt-20 bg-sand py-24 text-ink lg:py-32">
      <div className="mx-auto max-w-[1080px] px-4">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <Reveal>
            <Eyebrow dark={false}>How it works</Eyebrow>
            <h2 id="how-title" className={`mt-5 ${heading}`}>
              Built for Teams With Deadlines
            </h2>
            <p className="mt-5 max-w-[440px] text-lg leading-snug text-ink/60">
              No spreadsheets to chase and no status meetings to find out what is late. Three steps, and every
              project tells you how it is doing.
            </p>
            <div className="mt-10 grid grid-cols-2 gap-3" aria-hidden>
              <div className="flex h-[200px] flex-col justify-between rounded-[16px] bg-ink p-5 text-paper lg:h-[240px]">
                <span className="text-[12px] uppercase tracking-wide text-paper/50">PRJ-001</span>
                <span>
                  <span className="block text-[56px] font-bold leading-none tracking-[-0.06em]">92</span>
                  <span className="mt-2 inline-block rounded-full bg-mint px-2.5 py-0.5 text-[12px] font-semibold text-ink">
                    On track
                  </span>
                </span>
              </div>
              <div className="mt-8 flex h-[200px] flex-col justify-between rounded-[16px] bg-lilac p-5 lg:h-[240px]">
                <span className="text-[12px] uppercase tracking-wide text-ink/50">PRJ-002</span>
                <span>
                  <span className="block text-[56px] font-bold leading-none tracking-[-0.06em]">58</span>
                  <span className="mt-2 inline-block rounded-full bg-ink px-2.5 py-0.5 text-[12px] font-semibold text-lilac">
                    At risk
                  </span>
                </span>
              </div>
            </div>
          </Reveal>

          <ol className="relative space-y-4 lg:pt-16">
            {STEPS.map((step, i) => (
              <Reveal key={step.title} delay={i * 80}>
                <li className="flex gap-5 rounded-[18px] border border-ink/[0.08] bg-paper p-6 shadow-[0_1px_0_rgb(0_0_0/0.03)] transition-shadow hover:shadow-[0_20px_50px_rgb(0_0_0/0.10)]">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink font-mono text-[14px] text-mint">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[20px] font-semibold tracking-[-0.02em]">{step.title}</h3>
                    <p className="mt-1.5 text-[15px] leading-snug text-ink/60">{step.body}</p>
                    <code className="mt-4 inline-block max-w-full truncate rounded-lg bg-ink px-3 py-1.5 font-mono text-[12.5px] text-mint">
                      {step.sample}
                    </code>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>

        <dl className="mt-20 grid grid-cols-1 gap-px overflow-hidden rounded-[18px] border border-ink/[0.08] bg-ink/[0.08] sm:grid-cols-3">
          {STATS.map((s) => (
            <div key={s.value} className="bg-sand p-7">
              <dt className="sr-only">{s.label}</dt>
              <dd className="text-[52px] font-semibold leading-none tracking-[-0.05em]">{s.value}</dd>
              <dd className="mt-3 text-[15px] text-ink/60">{s.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ───────────────────────────── Roles ───────────────────────────── */

function Roles() {
  return (
    <section id="roles" aria-labelledby="roles-title" className="scroll-mt-20 bg-ink py-24 text-paper lg:py-32">
      <div className="mx-auto max-w-[1080px] px-4">
        <Reveal className="max-w-[640px]">
          <Eyebrow>Roles</Eyebrow>
          <h2 id="roles-title" className={`mt-5 ${heading}`}>
            A Normal Week With ProjectPulse
          </h2>
        </Reveal>
        <RoleTabs />
        <Reveal className="mt-4">
          <div className="relative flex min-h-[180px] items-center overflow-hidden rounded-[20px] bg-gradient-to-r from-[#18181b] via-[#18181b] to-lilac/40 px-7 py-10 sm:px-10">
            <p className="max-w-[340px] text-[22px] font-semibold leading-tight tracking-[-0.025em]">
              Managers and members, looking at the same project.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ───────────────────────────── Reports ───────────────────────────── */

function Reports() {
  const links = [
    { label: "Printable status report", note: "One page per project, ready for the client", href: "/register", icon: FileBarChart },
    { label: "CSV exports", note: "Projects, tasks and expenses for any spreadsheet", href: "/register", icon: FileDown },
  ];
  return (
    <section
      id="reports"
      aria-labelledby="reports-title"
      className="scroll-mt-20 border-t border-paper/[0.06] bg-ink py-24 text-paper lg:py-32"
    >
      <div className="mx-auto grid max-w-[1080px] grid-cols-1 gap-12 px-4 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <Reveal>
          <Eyebrow>Reports</Eyebrow>
          <h2 id="reports-title" className="mt-5 text-[clamp(2.1rem,4.2vw,3.4rem)] font-bold leading-[1.02] tracking-[-0.05em]">
            The Status Report Writes Itself
          </h2>
          <p className="mt-5 max-w-[420px] text-lg leading-snug text-paper/55">
            Progress, schedule, budget and the reasons behind the score, on one page. Print it, or export the
            raw data to CSV.
          </p>
          <ul className="mt-8 space-y-2.5">
            {links.map(({ label, note, href, icon: Icon }) => (
              <li key={label}>
                <Link
                  href={href}
                  className="group flex items-center gap-4 rounded-[14px] border border-paper/[0.07] bg-paper/[0.02] px-4 py-3.5 transition-colors hover:border-mint/30 hover:bg-paper/[0.04]"
                >
                  <Icon className="size-5 text-mint" aria-hidden />
                  <span>
                    <span className="block text-[15px] font-semibold">{label}</span>
                    <span className="block text-[13px] text-paper/45">{note}</span>
                  </span>
                  <ArrowRight
                    className="ml-auto size-4 text-paper/35 transition-transform group-hover:translate-x-0.5 group-hover:text-mint"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={80} className="min-w-0">
          <ReportPanel />
        </Reveal>
      </div>
    </section>
  );
}

/* ───────────────────────────── FAQ (light ground) ───────────────────────────── */

const FAQ = [
  {
    q: "How is the health score worked out?",
    a: "Each active project starts at 100 and loses points for falling behind schedule, overdue tasks, spending ahead of progress, missed milestones, open blockers and going 14 days without an update. 75 and above is On track, 50 and above is At risk, below that is Off track. The project page lists every reason.",
  },
  {
    q: "Who can see what?",
    a: "Admins see everything and manage accounts. Managers see and run the projects they manage. Members see the projects they belong to and the tasks assigned to them.",
  },
  {
    q: "When do people get notified?",
    a: "Members hear when they are assigned a task and when their tasks are due soon or overdue. Managers also hear when a blocker is reported, when tasks go overdue, and when spending passes 80% and 100% of the budget.",
  },
  {
    q: "Where are documents stored?",
    a: "Privately, alongside the project. Only signed-in members of that project can download them.",
  },
  {
    q: "Can I get my data out?",
    a: "Yes. Managers and admins can print a status report for any project and export projects, tasks and expenses to CSV.",
  },
];

function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="scroll-mt-20 bg-sand py-24 text-ink lg:py-32">
      <div className="mx-auto grid max-w-[1080px] grid-cols-1 gap-10 px-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Reveal>
          <Eyebrow dark={false}>FAQ</Eyebrow>
          <h2 id="faq-title" className="mt-5 text-[clamp(2.1rem,4vw,3.2rem)] font-bold leading-[1.02] tracking-[-0.05em]">
            Questions, Answered Plainly
          </h2>
        </Reveal>
        <div className="divide-y divide-ink/10 border-y border-ink/10">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[18px] font-semibold tracking-[-0.015em] [&::-webkit-details-marker]:hidden">
                {q}
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink/[0.06] transition-[transform,background-color] duration-300 group-open:rotate-45 group-open:bg-mint">
                  <Plus className="size-4" aria-hidden />
                </span>
              </summary>
              <p className="max-w-[600px] pb-6 text-[15.5px] leading-relaxed text-ink/65">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── Footer ───────────────────────────── */

const FOOTER_LINKS: { title: string; links: { label: string; href: string; external?: boolean }[] }[] = [
  { title: "Product", links: NAV.map((n) => ({ label: n.label, href: `#${n.id}` })) },
  {
    title: "Project",
    links: [
      { label: "Interactive preview", href: "#demo" },
      { label: "Source on GitHub", href: "https://github.com/ayush-dev-001/LPU_Project", external: true },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Get started", href: "/register" },
      { label: "Sign in", href: "/login" },
    ],
  },
];

function Footer() {
  const linkClass = "inline-flex items-center gap-1 text-[15px] text-paper/60 transition-colors hover:text-paper";
  return (
    <footer className="relative overflow-hidden bg-ink text-paper">
      <div className="mx-auto max-w-[1080px] px-4 pt-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-[24px] bg-mint px-7 py-12 text-ink sm:px-12 sm:py-14">
            <div
              className="pointer-events-none absolute -bottom-24 -right-10 size-[320px] rounded-full border-[40px] border-ink/[0.06]"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-40 right-24 size-[320px] rounded-full border-[40px] border-ink/[0.04]"
              aria-hidden
            />
            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-[clamp(2rem,4vw,3.3rem)] font-bold leading-[1.02] tracking-[-0.05em]">
                  Know How Every Project Is Doing
                </h2>
                <p className="mt-4 max-w-[420px] text-lg leading-snug text-ink/70">
                  Create an account, add your first project, and let the health score do the chasing.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="inline-flex h-12 items-center gap-2 rounded-[10px] bg-ink px-5 text-lg font-semibold text-paper transition-transform active:translate-y-px"
                >
                  Get started free
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center rounded-[10px] border border-ink/20 px-5 text-lg font-semibold transition-colors hover:bg-ink/[0.06]"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 gap-12 pb-14 pt-20 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <Wordmark />
            <p className="mt-4 max-w-[280px] text-[15px] leading-snug text-paper/50">
              Project monitoring for small teams. Every project, every role, one place.
            </p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            {FOOTER_LINKS.map(({ title, links }) => (
              <div key={title}>
                <h3 className="font-mono text-[12px] uppercase tracking-[0.08em] text-paper/40">{title}</h3>
                <ul className="mt-5 space-y-3">
                  {links.map((link) => (
                    <li key={link.label}>
                      {link.href.startsWith("/") ? (
                        <Link href={link.href} className={linkClass}>
                          {link.label}
                        </Link>
                      ) : (
                        <a
                          href={link.href}
                          {...(link.external && { target: "_blank", rel: "noreferrer" })}
                          className={linkClass}
                        >
                          {link.label}
                          {link.external && <span className="sr-only">(opens in a new tab)</span>}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-4 border-t border-paper/[0.08] py-7 text-[14px] text-paper/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} ProjectPulse · A college team project</p>
          <BackToTop />
        </div>
      </div>
    </footer>
  );
}
