# Plan 02 — Tasks: Kanban board, timeline & My tasks

- **Branch:** `feature/tasks-board`
- **Assigned to:** Teammate A
- **Start after Plan 01 is merged.** Create this branch from the updated `main`.

> **For the AI assistant:** you are working in an existing Next.js 16 + Prisma 7 + Tailwind 4 codebase called ProjectPulse. Read `CONTRIBUTING.md` and `AGENTS.md` in the repo root first and follow them exactly. Reuse existing helpers and components; do not create alternatives. Do **not** edit `prisma/schema.prisma`, anything in `src/lib/`, `src/components/`, or any `layout.tsx`. Only create or replace files listed in "Files" below.

## Goal

The team plans and tracks work as tasks: a drag-and-drop board per project, a timeline of the schedule, and a personal "My tasks" list across all projects.

## Context you need

- **Model:** `Task` in `prisma/schema.prisma`.
  - `status`: TODO / IN_PROGRESS / IN_REVIEW / DONE
  - `priority`: LOW / MEDIUM / HIGH / URGENT
  - `position` is the order inside a column.
  - `completedAt` must be set when the status becomes DONE and cleared otherwise.
- **Permissions** (`src/lib/permissions.ts`):
  - `getProjectAccess(user, projectId)` returns `{ canManage, isMember }`.
  - `canEditTask(user, access, task)`: managers and admins can edit any task; a member can edit only tasks assigned to them.
  - Only users with `canManage` can create or delete tasks or change the assignee. Members can change the **status** of their own tasks, and edit the description of their own tasks.
- The assignee must be the project manager or a project member. Validate this on the server.
- **Side effects:** `logActivity()` and `notify()`.
- **Install exactly these packages:** `npm i @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`

## Files

| File | Purpose |
|---|---|
| `src/app/(app)/projects/[id]/tasks/page.tsx` | Board page (server): loads tasks, members and milestones |
| `src/app/(app)/projects/[id]/tasks/board.tsx` | `"use client"` Kanban with dnd-kit |
| `src/app/(app)/projects/[id]/tasks/task-dialog.tsx` | `"use client"` create/edit form in a modal |
| `src/app/(app)/projects/[id]/tasks/actions.ts` | `createTask`, `updateTask`, `moveTask`, `deleteTask` |
| `src/app/(app)/projects/[id]/timeline/page.tsx` | Timeline (Gantt-style) |
| `src/app/(app)/tasks/page.tsx` | Replace the placeholder with My tasks |
| `src/app/(app)/tasks/actions.ts` | `setMyTaskStatus` (quick status change) |

## 1. Kanban board — `/projects/[id]/tasks`

- 4 columns: To do, In progress, In review, Done. Each column header shows its task count.
- **Card** shows:
  - title
  - priority (`StatusBadge`)
  - assignee initials avatar, or "Unassigned"
  - due date: red if overdue and not DONE, amber if due within 2 days
  - milestone name (small, grey)
- Clicking a card opens the task dialog.
- **Drag and drop** (dnd-kit) within and between columns. On drop:
  - update the UI optimistically
  - call `moveTask({ taskId, projectId, status, position })`
  - if it fails, roll back and show the error
- A member can drag **only their own** tasks; other cards are not draggable for them. The server checks again regardless.
- **Toolbar:**
  - "New task" button (managers only)
  - filters: assignee (All / Me / each member), priority, milestone
  - filters live in URL search params
- **Keyboard and accessibility:** use dnd-kit's `KeyboardSensor`, so cards can be moved without a mouse.

## 2. Task dialog (create / edit)

- **Fields:**
  - title (required, 2–160)
  - description (optional, max 5000)
  - status
  - priority
  - assignee: select of manager + members + "Unassigned"
  - milestone: select of this project's milestones + "None"
  - start date, due date (optional; due date must be on or after start date when both are set)
- **Members editing their own task:** only status and description are editable; the other fields are shown disabled.
- **Delete** button (managers only), with confirmation.
- **New tasks** get `position` = (max position in the target column) + 1, and `createdById = user.id`.

## 3. Server action rules

- **`createTask`, `deleteTask`**: require `{ manage: true }`.
- **`updateTask`:**
  - Load the task with `where: { id, projectId }` (404 if not found).
  - Check `canEditTask`.
  - If the user is not a manager, **ignore** every field except status and description. Don't trust the form.
- **`moveTask`:** same permission as a status change.
  - Re-number `position` for the affected column(s) in a `db.$transaction`, so positions stay 0..n-1.
- **Status → DONE** sets `completedAt = new Date()`. Any other status sets `completedAt = null`.
- **Assignee changes** (create or update to a different user): `notify` the new assignee.
  - type `TASK_ASSIGNED`, title "New task assigned", message `<task title> in <project name>`, link `/projects/<id>/tasks`, `excludeUserId: user.id`
- **`logActivity`:** `task.created`, `task.updated`, `task.status_changed` (details `{ from, to }`), `task.assigned`, `task.deleted`.
- **Assignee validation:** must be `project.managerId` or in `ProjectMember` for this project.
- `revalidatePath` for `/projects/<id>/tasks`, `/projects/<id>`, `/tasks` and `/dashboard`.

## 4. Timeline — `/projects/[id]/timeline`

A Gantt-style chart built with **plain CSS grid and Tailwind**; don't add a charting library.

- **Range:** from the project `startDate` to the later of `endDate` and the latest task due date. Columns are weeks, with a header row of week start dates (`formatDate`).
- **Rows:**
  - one per milestone, with its tasks grouped under it (tasks with no milestone go under "Other")
  - a task bar spans `startDate` → `dueDate` (if no start date, show a single-day bar at the due date; skip tasks with no dates and list them as "Unscheduled" below)
  - milestones are shown as diamonds on their due date
- **Bar colour by status:** DONE green, IN_PROGRESS / IN_REVIEW blue, TODO grey. Overdue and not DONE gets a red outline.
- A vertical "Today" line.
- Hovering a bar shows a `title` tooltip with the task name, assignee, dates and status.
- Scrolls horizontally inside its card on small screens (`overflow-x-auto`).
- Read-only for everyone who can view the project.

## 5. My tasks — `/tasks`

- All tasks where `assigneeId = user.id` and the status isn't DONE, across every project the user can see. Include the project code and name, linked to `/projects/<id>/tasks`.
- **Group into sections:** Overdue · Due today · This week (next 7 days) · Later · No due date. Hide empty sections.
- Each row has a compact status `Select` that calls `setMyTaskStatus`, with the same rules as `updateTask` for a member.
- Add a "Show completed (last 14 days)" toggle via a search param.
- Empty state: "Nothing assigned to you".

## Acceptance criteria

1. As **priya@** on PRJ-001, I can create a task assigned to aman@. Aman gets a notification row, and the task appears in the right column.
2. Dragging a card to Done sets `completedAt`. Dragging it back clears it. The order survives a refresh.
3. As **aman@**, I can drag my own tasks but not sneha@'s. Forging a `moveTask` or `updateTask` call on sneha@'s task returns an error, and the DB is unchanged.
4. As aman@, editing my task only changes the status and description, even if the form is tampered with to send a new assignee.
5. Assigning a task to someone who isn't on the project is rejected.
6. The timeline shows PRJ-002's overdue tasks with a red outline and the Today line in the right place.
7. `/tasks` for neha@ shows "Replace water lines" and "Bathroom fittings" under **Overdue**.
8. Works at 375px width (the board scrolls horizontally). `npm run check` passes.

## Out of scope

Comments on tasks, time tracking, subtasks, recurring tasks.
