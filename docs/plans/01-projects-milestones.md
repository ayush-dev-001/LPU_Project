# Plan 01 — Projects, members & milestones

- **Branch:** `feature/projects-milestones`
- **Assigned to:** Teammate A
- **Do this first.** Plan 02 builds on it.

> **For the AI assistant:** you are working in an existing Next.js 16 + Prisma 7 + Tailwind 4 codebase called ProjectPulse. Read `CONTRIBUTING.md` and `AGENTS.md` in the repo root first and follow them exactly. Reuse existing helpers and components; do not create alternatives. Do **not** edit `prisma/schema.prisma`, anything in `src/lib/`, `src/components/`, or any `layout.tsx`. Only create or replace files listed in "Files" below.

## Goal

Managers can create projects, choose the team, and track milestones. Everyone sees only the projects they belong to.

## Context you need

- The data model is in `prisma/schema.prisma`: `Project`, `ProjectMember`, `Milestone`, `User`. It already exists, so don't change it.
- **Auth:** `requireUser()` and `requireRole()` are in `src/lib/auth.ts`.
- **Permissions:** `visibleProjectsWhere`, `canCreateProject`, `getProjectAccess` and `canEditTask` are in `src/lib/permissions.ts`.
  - ADMIN can do everything.
  - MANAGER can create projects and fully manage projects where `managerId` is them.
  - MEMBER can only view projects they're a member of.
- **Side effects:** `logActivity()` is in `src/lib/activity.ts` and `notify()` is in `src/lib/notifications.ts`.
- **UI:** use the components in `src/components/ui/`. Formatting helpers are in `src/lib/utils.ts`.
- `/projects/[id]/layout.tsx` already renders the project header and tab bar, and already 404s users without access. Your overview page only renders the content under the tabs.

## Files

| File | Purpose |
|---|---|
| `src/app/(app)/projects/page.tsx` | Replace the placeholder with the project list |
| `src/app/(app)/projects/new/page.tsx` | Create project page |
| `src/app/(app)/projects/project-form.tsx` | `"use client"` form shared by new and edit |
| `src/app/(app)/projects/actions.ts` | `createProject`, `updateProject`, `deleteProject` |
| `src/app/(app)/projects/[id]/page.tsx` | Replace the placeholder with the Overview tab |
| `src/app/(app)/projects/[id]/edit/page.tsx` | Edit project page (managers only) |
| `src/app/(app)/projects/[id]/members.tsx` | Members card with add and remove |
| `src/app/(app)/projects/[id]/milestones.tsx` | Milestones card with create, edit, complete and delete |
| `src/app/(app)/projects/[id]/actions.ts` | `addMember`, `removeMember`, `createMilestone`, `updateMilestone`, `toggleMilestone`, `deleteMilestone` |

## 1. Project list — `/projects`

- `PageHeader` titled "Projects". If `canCreateProject(user)`, show a "New project" button linking to `/projects/new`.
- Query: `db.project.findMany({ where: { ...visibleProjectsWhere(user), ...filters } })`.
- **Filters** use URL search params (`?status=ACTIVE&q=hostel`), so they survive refresh. Remember `searchParams` is a Promise in Next 16.
  - Status select: All, Planning, Active, On hold, Completed, Cancelled.
  - Text search: case-insensitive match on `name` or `code`.
- **Show each project as a card in a responsive grid** (1, 2 or 3 columns). Each card shows:
  - code (mono, small), name (link to `/projects/[id]`), `StatusBadge`
  - manager name, member count, end date (red if past and status isn't COMPLETED or CANCELLED)
  - **task progress:** "12 / 20 tasks done" and a thin progress bar. Count with `_count` or `groupBy`, not by loading every task.
- Sort: ACTIVE first, then PLANNING, ON_HOLD, COMPLETED, CANCELLED; within a status, by `endDate` ascending.
- **Empty state:** "No projects yet". Include the create button if the user is allowed to create projects.

## 2. Create / edit project

- **Fields:** name (required, 3–120 chars), code, description (optional, max 2000), status, start date, end date, budget (₹, integer ≥ 0), manager, members.
- **Code:**
  - Pre-fill on create with the next free code, `PRJ-` + 3 digits (find the highest existing number and add 1).
  - Editable. Must match `^[A-Z]{2,5}-\d{3,5}$` and be unique; show a field error if it's taken.
- End date must be on or after the start date. Return this as a field error on `endDate`.
- **Manager select:**
  - ADMIN can pick any active user with role MANAGER or ADMIN.
  - MANAGER's select is locked to themselves.
- **Members:** a checkbox list of active users, excluding whoever is chosen as manager.
- `createProject` creates the project and its `ProjectMember` rows in one `db.$transaction` (or a nested create), then:
  - `logActivity` with `project.created`
  - `notify` each member: type `PROJECT_UPDATE`, title "Added to project", message `You were added to <name>`, link `/projects/<id>`, excluding the creator
  - redirect to `/projects/<id>`
- **Edit page:** only for users with `{ manage: true }` access. Load the existing values into the same form.
  - On save, update the members list: add new ones and remove unticked ones. Notify only **newly added** members.
  - `logActivity` with `project.updated`.
- **Delete:** a "Delete project" danger button at the bottom of the edit page.
  - Ask for confirmation by having the user type the project code.
  - Only ADMIN or the project's manager can delete. Cascade is already set up in the schema.
  - Redirect to `/projects`.

## 3. Overview tab — `/projects/[id]`

Use a two-column layout on desktop: main content on the left, side cards on the right. Stack them on mobile.

- **About card:** description (or "No description"), start and end dates, days remaining (or "N days overdue" in red), budget as `formatINR`. If the user can manage the project, show an "Edit project" button.
- **Quick stats row** of 4 small cards:
  - tasks done / total
  - overdue tasks: `dueDate < today` and status ≠ DONE
  - milestones done / total
  - latest update date, or "—"
- **Members card** (`members.tsx`):
  - The manager is shown first with a "Manager" badge, then the members.
  - Managers can add a member (select from active users who aren't already on the project) and remove one (with confirmation).
  - Removing a member does **not** delete their tasks. Show a warning if they still have tasks that aren't DONE.
  - `notify` the added user. `logActivity` with `member.added` / `member.removed`.
- **Milestones card** (`milestones.tsx`):
  - List sorted by `dueDate`. Each row shows a status checkbox, title, due date and a badge: Done, Overdue (pending and past due), or Due soon (within 7 days).
  - Also show the task progress for each milestone, e.g. "3/5 tasks".
  - Managers can create, edit and delete milestones (title required; description optional; due date required).
  - Ticking a milestone sets `status = COMPLETED, completedAt = now`. Unticking sets it back to `PENDING` and clears `completedAt`.
  - `logActivity` with `milestone.created` / `milestone.completed` / `milestone.reopened` / `milestone.deleted`.
  - Members see the list read-only.

## 4. Server actions — rules

- **Every** action starts with `requireUser()`, validates with Zod, then calls `getProjectAccess(user, projectId, { manage: true })`. The overview page itself only needs view access.
- Milestone update and delete must use `where: { id, projectId }` so a milestone from another project can't be edited by passing its id.
- Only someone who passes `canCreateProject(user)` can create a project. A MANAGER can't set another user as manager; force `managerId = user.id` on the server.
- `revalidatePath` for `/projects`, `/projects/<id>` and `/dashboard` after changes.
- Return `ActionState` (see `src/lib/action-state.ts`). Use `fromZodError` for validation failures.

## Acceptance criteria

1. As **admin**, I can see all 4 seeded projects. As **aman@** (member), I see only PRJ-001 and PRJ-004. As **priya@** (manager), I see PRJ-001 and PRJ-003.
2. As aman@, opening `/projects/<PRJ-002 id>` shows a 404.
3. As aman@, there's no "New project" button. Calling `createProject` directly (for example by forging the form) is rejected on the server.
4. As priya@, I can create a project: the code pre-fills as `PRJ-005`, it appears in the list, members get a notification row, and an `ActivityLog` row exists.
5. As priya@, I can't edit PRJ-002, which belongs to rahul@. Visiting `/projects/<PRJ-002 id>/edit` shows a 404.
6. Validation shows field errors for a duplicate code, end date before start date, and a negative budget.
7. Milestones can be added, ticked, unticked, edited and deleted by the manager. Members see them read-only.
8. Filters and search on `/projects` work and survive a page refresh.
9. Works at 375px width. `npm run check` passes.

## Out of scope

Don't build any of these; other plans cover them: tasks, Kanban board or timeline (Plan 02), updates or budget (Plan 03), documents (Plan 04), or a health score (lead).
