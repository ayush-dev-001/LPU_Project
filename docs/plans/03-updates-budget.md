# Plan 03 — Progress updates & budget tracking

- **Branch:** `feature/updates-budget`
- **Assigned to:** Teammate B
- **You can start right away**, in parallel with Plan 01. Your pages are tabs that already exist under `/projects/[id]/`.

> **For the AI assistant:** you are working in an existing Next.js 16 + Prisma 7 + Tailwind 4 codebase called ProjectPulse. Read `CONTRIBUTING.md` and `AGENTS.md` in the repo root first and follow them exactly. Reuse existing helpers and components; do not create alternatives. Do **not** edit `prisma/schema.prisma`, anything in `src/lib/`, `src/components/`, or any `layout.tsx`. Only create or replace files listed in "Files" below.

## Goal

The team reports progress and blockers regularly, and managers can see planned vs. actual spend, with alerts before a project goes over budget.

## Context you need

- **Models** in `prisma/schema.prisma`:
  - `ProgressUpdate`: summary, blockers?, percentComplete?
  - `Expense`: title, amount (whole ₹), category, spentOn
  - `Project.budget`: planned budget in whole ₹
- **Permissions** (`src/lib/permissions.ts`): `getProjectAccess(user, projectId)` returns `{ canManage, isMember }`.
  - Anyone with `isMember` (members, the manager and admins) can **post** updates.
  - The author, or anyone with `canManage`, can **delete** an update.
  - Only `canManage` can add, edit or delete **expenses**. Everyone who can view the project can see the budget page.
- **Side effects:** `logActivity()` and `notify()`.
- **Charts:** `recharts` is already installed. Chart components must be `"use client"`.
- The `/projects/[id]` layout already renders the header and tabs, and 404s users without access.

## Files

| File | Purpose |
|---|---|
| `src/app/(app)/projects/[id]/updates/page.tsx` | Project updates tab |
| `src/app/(app)/projects/[id]/updates/update-form.tsx` | `"use client"` post form |
| `src/app/(app)/projects/[id]/updates/actions.ts` | `postUpdate`, `deleteUpdate` |
| `src/app/(app)/updates/page.tsx` | Replace the placeholder with the global updates feed |
| `src/app/(app)/updates/update-card.tsx` | Shared card used by both feeds (Server Component) |
| `src/app/(app)/projects/[id]/budget/page.tsx` | Budget tab |
| `src/app/(app)/projects/[id]/budget/budget-charts.tsx` | `"use client"` Recharts charts |
| `src/app/(app)/projects/[id]/budget/expense-form.tsx` | `"use client"` add/edit expense form |
| `src/app/(app)/projects/[id]/budget/actions.ts` | `addExpense`, `updateExpense`, `deleteExpense` |

## 1. Project updates tab — `/projects/[id]/updates`

- **Post form** at the top (only for `isMember`):
  - "What did you get done?" (summary, required, 5–2000 chars)
  - "Anything blocking you?" (blockers, optional, max 1000)
  - "Overall progress %" (optional number, 0–100)
- **Feed** below, newest first, paginated 20 at a time with a "Load more" link (`?page=2`).
- **`update-card.tsx` shows:**
  - author initials avatar and name
  - relative time ("2 hours ago"); write a small helper inside your feature folder
  - summary (keep line breaks: `whitespace-pre-line`)
  - if there are blockers: an amber box with a warning icon titled "Blocker"
  - if percentComplete is set: a small progress bar
  - a delete button for the author or manager, with confirmation
- **`postUpdate`:**
  - `requireUser` → Zod → `getProjectAccess`, and require `isMember`
  - create the update
  - `logActivity("update.posted")`
  - **if blockers is non-empty**, `notify` the project manager: type `PROJECT_UPDATE`, title "Blocker reported", message `<author> on <project>: <first 100 chars of blockers>`, link `/projects/<id>/updates`, `excludeUserId: user.id`
- **`deleteUpdate`:** load with `where: { id, projectId }`, then allow only the author or `canManage`.

## 2. Global feed — `/updates`

- Updates from **all projects the user can see**: `where: { project: visibleProjectsWhere(user) }`.
- **Filters** (search params):
  - project select (only visible projects)
  - "Only with blockers" checkbox
- Each card also shows the project code and name, linked to `/projects/<id>/updates`.
- Reuse `update-card.tsx`. Use the same pagination as above.
- Empty state: "No updates yet".

## 3. Budget tab — `/projects/[id]/budget`

- **4 stat cards:**
  - Budget
  - Spent (sum of expenses)
  - Remaining (red if negative)
  - % used, coloured green below 80%, amber from 80% to 100%, red above 100%
- **Charts** (`budget-charts.tsx`, Recharts, responsive container, about 260px tall):
  1. **Spend by category:** a horizontal bar chart. Show only the categories that have spend.
  2. **Cumulative spend over time:** a line or area chart by month (`spentOn`), with a dashed reference line at the budget amount.
  - Format axis and tooltip values with `formatINR`. Use `brand` indigo plus slate; red only for over budget.
- **Expense table:** date, title, category badge, amount (right-aligned), recorded by.
  - Edit and delete actions for managers.
  - Sorted by `spentOn`, newest first.
  - Total row at the bottom.
- **"Add expense"** (managers only), with these fields:
  - title (2–120)
  - amount (integer ₹, 1 to 1,00,00,000)
  - category select
  - date (not in the future)
- **Budget alerts** run in `addExpense` and `updateExpense`:
  - Compute % used **before** and **after** the change.
  - If it crosses **80%** or **100%** (from below the line to on or above it), `notify` the project manager **and all active ADMIN users**.
    - type `BUDGET_ALERT`
    - title "Budget 80% used" or "Budget exceeded"
    - message `<project name> has used <x>% of its <formatINR(budget)> budget.`
    - link `/projects/<id>/budget`
    - `excludeUserId: user.id`
  - If the budget is 0, skip the percentage alerts.
- **`logActivity`:** `expense.added`, `expense.updated`, `expense.deleted` (details: title, amount).
- `updateExpense` and `deleteExpense` use `where: { id, projectId }`.
- Sum amounts with `db.expense.aggregate` / `groupBy`, not in JavaScript over every row.
- `revalidatePath` for `/projects/<id>/budget`, `/projects/<id>` and `/dashboard`.

## Acceptance criteria

1. As **neha@** on PRJ-002, I can post an update with a blocker. rahul@ (the manager) gets a "Blocker reported" notification row.
2. As **aman@**, I can't post on PRJ-002 (404) and don't see PRJ-002 updates in `/updates`.
3. The PRJ-002 budget tab shows about 98% used in red/amber, and the charts render with the seeded data.
4. As **rahul@**, adding a ₹50,000 expense to PRJ-002 pushes it over 100%: rahul is excluded, and the admin gets a "Budget exceeded" notification. Adding another one doesn't send a second "exceeded" alert, because the line was already crossed.
5. As **karan@** (a member of PRJ-002), I can view the budget page but there's no add/edit/delete button, and forging `addExpense` is rejected.
6. Validation: a negative amount, a future date or an empty title gives field errors.
7. The "Only with blockers" filter and pagination work on `/updates`.
8. Works at 375px width. `npm run check` passes.

## Out of scope

File attachments on updates, editing an update, multi-currency, approval workflows for expenses.
