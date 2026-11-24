# ProjectPulse

**Web-Based Integrated Project-Monitoring Platform** (LPU team project)

ProjectPulse puts every project an organisation runs in one place: tasks, milestones, budget, documents and team updates. From that data it works out a **health score** for each project, so a manager can see at a glance which projects are slipping and why.

## Features

| Area | What it does |
|---|---|
| Auth & roles | Sign in, three roles (Admin, Manager, Member), admin user management |
| Projects & milestones | Create projects, assign a manager and members, track milestones |
| Tasks | Kanban board, timeline (Gantt-style) view, "My tasks" across projects |
| Progress updates | Members post what they did and what's blocking them |
| Budget | Planned vs. actual spend, expenses by category, overrun alerts |
| Documents | Upload files to a project or task, with access control |
| Notifications | In-app alerts for assignments, due dates, overdue work, budget |
| Reports | CSV export and printable (PDF) project status reports |
| Dashboard | Portfolio health score, at-risk projects, workload charts |

**Live demo:** https://lpu-project.vercel.app (sign in with a demo account below).

## Tech stack

Next.js 16 (App Router, Server Actions) · TypeScript · PostgreSQL + Prisma 7 · Tailwind CSS 4 · Zod · jose (JWT sessions) · Recharts · Vercel Blob (document storage in production)

## Deploying to Vercel

1. Import the repository in Vercel and add a **Prisma Postgres** database from the Storage tab. It sets `DATABASE_URL`.
2. Add a **Blob** store from the Storage tab and connect it to the project. It sets `BLOB_READ_WRITE_TOKEN`, so uploaded documents are kept in a private store. Without it, uploads go to the server's disk, which Vercel does not keep.
3. Add `SESSION_SECRET` and `CRON_SECRET` (long random strings) under Settings → Environment Variables.
4. Deploy. The `vercel-build` script applies database migrations before building.
5. Load demo data once from your machine: set `DATABASE_URL` to the production connection string in your terminal and run `npm run db:seed`. This wipes existing data.

## Getting started

Requirements: Node.js 20+ and Git.

```bash
git clone https://github.com/ayush-dev-001/LPU_Project.git
cd LPU_Project
npm install
```

**1. Start a database.** The easiest way is Prisma's built-in local Postgres, which doesn't need Docker:

```bash
npx prisma dev -d -n lpu
```

It prints connection URLs. Copy the **TCP** one, which starts with `postgres://`.

**2. Create `.env`.** Copy `.env.example` to `.env`, then:
- Set `DATABASE_URL` to the TCP URL from step 1.
- Set `SHADOW_DATABASE_URL` to the same URL with the port increased by 1.
- Set `SESSION_SECRET` to the output of `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.

**3. Create the tables and demo data, then run:**

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

Open http://localhost:3000.

> Next time, just run `npx prisma dev start lpu` (if the database isn't running), then `npm run dev`.

### Demo accounts

All demo accounts use the password `Password@123`.

| Email | Role |
|---|---|
| admin@projectpulse.dev | Admin |
| priya@projectpulse.dev, rahul@projectpulse.dev | Manager |
| aman@, sneha@, karan@, neha@projectpulse.dev | Member |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run check` | Lint + type-check + tests + production build (**run before every PR**) |
| `npm run db:migrate` | Apply migrations to your local database |
| `npm run db:seed` | Reset demo data |
| `npm run db:reset` | Drop everything, re-migrate and re-seed |
| `npm run db:studio` | Browse the database in your browser |

## Project structure

```
prisma/
  schema.prisma        all tables (owned by the team lead)
  seed.ts              demo data
src/
  app/
    (auth)/            login, register
    (app)/             everything behind login (sidebar layout)
      dashboard/  projects/  tasks/  updates/  notifications/  reports/  admin/users/
      projects/[id]/   project page with tabs: overview, tasks, timeline, updates, budget, documents
    actions/           shared server actions (auth)
  components/
    ui/                buttons, inputs, cards, badges (use these, don't restyle from scratch)
    layout/            sidebar, mobile menu
  lib/
    auth.ts            getCurrentUser / requireUser / requireRole
    permissions.ts     who can see and change what
    db.ts              Prisma client
    activity.ts        logActivity()
    notifications.ts   notify()
    utils.ts           formatting helpers
docs/plans/            one build plan per feature branch
```

## Team workflow

See [CONTRIBUTING.md](CONTRIBUTING.md). In short: one branch per feature, open a PR into `main`, and the PR is reviewed before it's merged.
