# Plan 04 — Documents, notifications & reports

- **Branch:** `feature/documents-notifications-reports`
- **Assigned to:** Teammate B
- **Start after Plan 03 is merged.** Create this branch from the updated `main`.

> **For the AI assistant:** you are working in an existing Next.js 16 + Prisma 7 + Tailwind 4 codebase called ProjectPulse. Read `CONTRIBUTING.md` and `AGENTS.md` in the repo root first and follow them exactly. Reuse existing helpers and components; do not create alternatives. Do **not** edit `prisma/schema.prisma`, anything in `src/lib/`, `src/components/`, or any `layout.tsx`. Only create or replace files listed in "Files" below.

## Goal

1. Teams keep project files in one place, with access control.
2. Everyone gets told about things that need their attention: assignments, due dates, overdue work, budget.
3. Managers can export reports.

## Context you need

- **Models** in `prisma/schema.prisma`:
  - `Document`: name, url, storageKey, mimeType, size, optional taskId
  - `Notification`: type, title, message, link?, readAt?
- `notify()` in `src/lib/notifications.ts` already creates notifications. Other features call it. You build the **inbox**, the **automatic alerts** and **reports**.
- **Permissions** (`src/lib/permissions.ts`):
  - Anyone with `isMember` can upload to a project.
  - The uploader, or anyone with `canManage`, can delete a document.
  - Anyone who can view the project can download.
  - Reports are for ADMIN and MANAGER only: use `requireRole("ADMIN", "MANAGER")`, and limit the data to `visibleProjectsWhere(user)`.
- **No new npm packages.** CSV is built by hand. PDF is produced by the browser's "Save as PDF" from a print-friendly page.

## Files

| File | Purpose |
|---|---|
| `src/app/(app)/projects/[id]/documents/storage.ts` | `saveFile`, `readFile`, `removeFile`: local disk storage under `./uploads` |
| `src/app/(app)/projects/[id]/documents/page.tsx` | Documents tab |
| `src/app/(app)/projects/[id]/documents/upload-form.tsx` | `"use client"` upload form |
| `src/app/(app)/projects/[id]/documents/actions.ts` | `uploadDocument`, `deleteDocument` |
| `src/app/api/documents/[id]/route.ts` | `GET`: access-checked download |
| `src/app/(app)/notifications/page.tsx` | Replace the placeholder with the inbox |
| `src/app/(app)/notifications/actions.ts` | `markRead`, `markAllRead`, `openNotification`, `runAlertsNow` |
| `src/app/(app)/notifications/alerts.ts` | `runAlerts()`: due-soon / overdue / milestone alerts |
| `src/app/api/cron/alerts/route.ts` | `GET`, protected by `CRON_SECRET`, calls `runAlerts()` |
| `vercel.json` | Daily cron hitting `/api/cron/alerts` |
| `src/app/(app)/reports/page.tsx` | Replace the placeholder with the reports hub |
| `src/app/api/reports/[kind]/route.ts` | CSV downloads: `projects`, `tasks`, `expenses` |
| `src/app/(app)/reports/[projectId]/print/page.tsx` | Printable project status report |

## 1. Documents

### Storage (`storage.ts`, `import "server-only"`)

- Save to `path.join(process.cwd(), "uploads", projectId, <cuid>-<sanitised name>)`. `uploads/` is gitignored.
- `storageKey` is the path relative to `uploads/`. Set `url` to `/api/documents/<documentId>`.
- **Sanitise** file names: keep `[a-zA-Z0-9._-]`, replace the rest with `_`, and cap at 100 chars.
- **Never** build a path from user input without sanitising it. Check that the resolved path stays inside `uploads/` to block path traversal.
- Write a comment at the top: to deploy to Vercel, swap this file for Vercel Blob. Keep the 3-function interface so that's a one-file change.

### Upload (`uploadDocument`)

- Accept `FormData` with `file`, `projectId` and an optional `taskId`.
- **Max size 10 MB.**
- **Allowed types:** pdf, png, jpg/jpeg, webp, doc/docx, xls/xlsx, ppt/pptx, txt, csv, zip. Check both the MIME type **and** the extension.
- If a `taskId` is given, it must belong to the same project.
- Create the `Document` row, then `logActivity("document.uploaded")`.

### Documents tab

- Upload form at the top (for `isMember`), with an optional "Related task" select.
- Table: file-type icon, name (link to download), related task, size (KB/MB), uploaded by, date, delete button (uploader or manager).
- Empty state: "No documents yet".

### Download route (`/api/documents/[id]`)

- `getCurrentUser()`: if there's no user, return 401.
- Load the document. Check view access to its project with `visibleProjectsWhere`. If there's no access, return **404** (not 403).
- Stream the file with the correct `Content-Type`, `Content-Disposition: attachment; filename="<name>"` and `X-Content-Type-Options: nosniff`.

### Delete

- `where: { id, projectId }`; only the uploader or a manager.
- Remove the file from disk too. Ignore a missing file, but still delete the row.

## 2. Notifications

### Inbox — `/notifications`

- The current user's notifications, newest first, 30 per page.
- Tabs: **Unread** / **All** (search param).
- **Each row shows:**
  - a type icon: `TASK_ASSIGNED` user-plus, `TASK_DUE_SOON` clock, `TASK_OVERDUE` alert, `MILESTONE_DUE_SOON` flag, `BUDGET_ALERT` wallet, `PROJECT_UPDATE` message, `GENERAL` bell
  - title, message, relative time
  - unread rows get a brand-coloured dot and a light background
- Clicking a row calls `openNotification(id)`, which marks it read (only if it's the user's own) and redirects to its `link`.
- "Mark all as read" button.
- **ADMIN only:** a "Run alerts now" button that calls `runAlertsNow` and shows "Created N alerts".
- The sidebar unread badge already exists in the layout. Call `revalidatePath("/", "layout")` after marking read so it updates.

### Automatic alerts (`alerts.ts` → `runAlerts(): Promise<number>`)

The function returns the number of notifications created. For tasks and milestones in projects whose status is ACTIVE or PLANNING:

| Alert | Condition | Who | type |
|---|---|---|---|
| Task due soon | not DONE, `dueDate` within the next 2 days | assignee | `TASK_DUE_SOON` |
| Task overdue | not DONE, `dueDate` before today | assignee **and** project manager | `TASK_OVERDUE` |
| Milestone due soon | PENDING, `dueDate` within 3 days | project manager | `MILESTONE_DUE_SOON` |

- **No duplicates:** don't create a notification if the same user already has one with the same `type` and the same `link` in the last 24 hours.
  - Link format for tasks: `/projects/<projectId>/tasks?task=<taskId>`
  - Link format for milestones: `/projects/<projectId>?milestone=<id>`
- Messages, for example: `“Replace water lines” (Hostel Block C Renovation) is 6 days overdue.`
- **Cron route:**
  - Returns 401 unless the `Authorization` header is `Bearer ${process.env.CRON_SECRET}`.
  - Returns `{ created: n }`.
  - Add `CRON_SECRET=` to the notes in the PR description. The lead adds it to `.env.example`.
- **`vercel.json`:** `{ "crons": [{ "path": "/api/cron/alerts", "schedule": "0 3 * * *" }] }`. That's 03:00 UTC, about 8:30 IST.

## 3. Reports — `/reports` (ADMIN and MANAGER)

Show three cards, each with a short description and a "Download CSV" button:

1. **Projects summary:** code, name, status, manager, start, end, budget, spent, % budget used, tasks total, tasks done, overdue tasks, milestones done/total.
2. **Tasks:** project code, title, status, priority, assignee, milestone, due date, completed at, overdue (yes/no). Optional project filter select.
3. **Expenses:** project code, date, title, category, amount, recorded by. Optional project filter.

Below those, a **"Project status report"** select. Choosing a project opens `/reports/<projectId>/print`.

**CSV route** (`/api/reports/[kind]`):

- Check the role (`getCurrentUser()`, ADMIN or MANAGER, otherwise 403) and scope the data to `visibleProjectsWhere(user)`.
- Escape fields properly: wrap in quotes and double any internal quotes.
- Prefix with a UTF-8 BOM so Excel shows ₹ and names correctly.
- Return `Content-Disposition: attachment; filename="projectpulse-<kind>-<YYYY-MM-DD>.csv"`.
- Return 404 for an unknown `kind`.

**Print page:** a clean, single-column A4-friendly layout that contains:

- project name, code, status, manager, dates, generated-on date
- key numbers: progress % (tasks done/total), budget used, overdue tasks
- the milestones table, the open tasks table, the last 5 updates (with blockers highlighted), and spend by category
- a "Print / Save as PDF" button that calls `window.print()`. That needs a tiny client component; hide it when printing with Tailwind's `print:hidden`.
- Uses `getProjectAccess`, so a user who can't see the project gets a 404.

## Acceptance criteria

1. As **aman@** on PRJ-001, I can upload a PDF and then download it. As **karan@** (not on PRJ-001), opening `/api/documents/<that id>` returns 404.
2. Uploading an `.exe`, a file over 10 MB, or a `.pdf` with the wrong MIME type is rejected with a clear message.
3. Deleting a document removes both the row and the file on disk.
4. The inbox shows the 3 seeded notifications for the right users. Clicking one marks it read, goes to its link, and the sidebar badge goes down.
5. As **admin**, "Run alerts now" creates overdue alerts for neha@'s two overdue tasks (plus rahul@ as the manager). Running it again immediately creates **0**.
6. `/api/cron/alerts` without the right `Authorization` header returns 401.
7. As **aman@** (member), `/reports` redirects to the dashboard and `/api/reports/projects` returns 403. As **priya@**, the CSVs only contain PRJ-001 and PRJ-003.
8. The CSVs open correctly in Excel (₹ and commas inside names are fine). The print page looks clean in print preview.
9. Works at 375px width. `npm run check` passes.

## Out of scope

Email or SMS delivery, real-time push (WebSockets), document versioning, scheduled report emails.
