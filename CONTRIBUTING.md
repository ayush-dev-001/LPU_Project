# Contributing to ProjectPulse

These rules keep three people's code consistent, so PRs can be reviewed and merged quickly.
**If you use an AI assistant, give it this file together with your plan from `docs/plans/`.**

## 1. Git workflow

```bash
git checkout main
git pull
git checkout -b feature/<name-from-your-plan>
# ...work, committing often...
npm run check                   # must pass before you push
git push -u origin feature/<name>
```

Then open a Pull Request into `main` on GitHub and fill in the PR template.

**What happens next:**
- **CI** checks lint, types, tests and build.
- **The review bot** (`claude[bot]`) reviews the PR within a few minutes, checking it against this file and your plan.
  - If it **requests changes**: fix them, commit and push to the same branch, and it reviews again automatically.
  - If it **approves** and CI is green, the lead merges the PR.

- **Never push directly to `main`.**
- One PR per plan. Don't mix in unrelated changes or reformat other people's files.
- If `main` moved while you worked: `git fetch origin && git merge origin/main`, fix any conflicts, and run `npm run check` again.
- Commit messages: short and in the present tense, for example `Add milestone form` or `Fix overdue badge colour`.
- Don't commit `.env`, `uploads/` or `src/generated/` (they're already in `.gitignore`).

## 2. Folder ownership

Every page has one owner, so two people never edit the same files. The placeholder pages say which branch owns them (`// PLACEHOLDER — owned by ...`). When you build the feature, replace the whole placeholder file.

| Owner branch | Folders |
|---|---|
| `feature/projects-milestones` | `(app)/projects/` (list, new, edit), `(app)/projects/[id]/page.tsx` (overview) |
| `feature/tasks-board` | `(app)/projects/[id]/tasks/`, `(app)/projects/[id]/timeline/`, `(app)/tasks/` |
| `feature/updates-budget` | `(app)/projects/[id]/updates/`, `(app)/projects/[id]/budget/`, `(app)/updates/` |
| `feature/documents-notifications-reports` | `(app)/projects/[id]/documents/`, `(app)/notifications/`, `(app)/reports/`, `src/app/api/` |
| Team lead | `prisma/`, `src/lib/`, `src/components/`, layouts, `(app)/dashboard/`, `(app)/admin/` |

If you need a change in a lead-owned file (a new helper, a new UI component, a schema change), **ask in the PR description** instead of editing it. Small, purely additive helpers in a new file under your own feature folder are fine.

## 3. Stack rules (read before writing code)

- **Next.js 16** with the App Router. Some things differ from older tutorials:
  - `params` and `searchParams` are **Promises**: `const { id } = await params;`
  - `cookies()` and `headers()` are async.
  - Middleware is now called `src/proxy.ts`. It's already set up, so don't add a `middleware.ts`.
  - Cache Components is **off** (`next.config.ts`). Pages that read the logged-in user render dynamically, so you don't need `"use cache"` or Suspense workarounds.
- **Prisma 7.** Import the client only as `import { db } from "@/lib/db"`. Import types and enums from `@/generated/prisma/client` and `@/generated/prisma/enums`.
- **Money** is stored as whole rupees (`Int`). Show it with `formatINR()`.
- **Dates:** show them with `formatDate()` / `formatDateTime()`. For `<input type="date">`, use `toDateInputValue()`.
- No new npm packages unless your plan lists them. Ask in the PR if you need another one.

## 4. Security rules (PRs that break these are not merged)

Every page and every server action must check access on the **server**:

```ts
const user = await requireUser();                                     // signed in?
const access = await getProjectAccess(user, projectId);               // can see this project? (404s otherwise)
const access = await getProjectAccess(user, projectId, { manage: true }); // can manage it?
if (!canEditTask(user, access, task)) return { error: "You can't edit this task." };
```

- Never trust IDs or roles sent from the browser. Re-check them on the server every time.
- When updating or deleting by id, also make sure the row belongs to the project you checked, for example `where: { id: taskId, projectId }`.
- List queries must be limited to what the user can see. Use `visibleProjectsWhere(user)` for project lists.
- Hiding a button in the UI is **not** a permission check.

## 5. Server action pattern

Every mutation is a Server Action in an `actions.ts` file next to the page that uses it.

```ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getProjectAccess } from "@/lib/permissions";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { fromZodError, type ActionState } from "@/lib/action-state";

const schema = z.object({
  projectId: z.string().min(1),
  title: z.string().trim().min(2, "Title is too short.").max(120),
});

export async function createThing(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const access = await getProjectAccess(user, parsed.data.projectId, { manage: true });
  const thing = await db.milestone.create({ data: { /* ... */ } });

  await logActivity({ actorId: user.id, projectId: access.project.id, action: "thing.created", entityType: "Thing", entityId: thing.id });
  revalidatePath(`/projects/${access.project.id}`);
  return { success: "Created." };
}
```

On the client, use it with `useActionState(action, undefined)` and show errors using `Field` / `FormMessage` (see `src/app/(auth)/login/login-form.tsx` for an example).

- Validate **all** input with Zod on the server.
- Call `logActivity()` after every create, update or delete that matters.
- Call `notify()` when someone else should find out (for example, when a task is assigned to them).
- Call `revalidatePath()` for every page that shows the changed data.

## 6. UI rules

- Use the components in `src/components/ui/` (`Button`, `Input`, `Select`, `Textarea`, `Field`, `Card`, `Badge`, `StatusBadge`, `PageHeader`, `EmptyState`, `SubmitButton`).
- Tailwind only, no CSS files. The brand colour is `brand-*` (indigo), and neutrals are `slate-*`.
- Every list needs an `EmptyState` when it has no items.
- Every form must show validation errors and a pending state (`SubmitButton` handles the pending state).
- Pages must work at phone width (375px). Wide tables go inside `overflow-x-auto`.
- Server Components by default. Add `"use client"` only for interactivity (forms, drag and drop, charts).

## 7. Testing your work

There are demo accounts for each role. The password for all of them is `Password@123`.

- **Admin:** admin@projectpulse.dev
- **Managers:** priya@ manages PRJ-001 and PRJ-003; rahul@ manages PRJ-002 and PRJ-004
- **Members:** aman@ and sneha@ are on PRJ-001 and PRJ-004; karan@ and neha@ are on PRJ-002; neha@ is also on PRJ-003

Before opening a PR, check your feature **as each role**. In particular, check that a member can't do manager-only things, even by calling the action directly. Then run `npm run check`.

## 8. Changing the schema

`prisma/schema.prisma` is owned by the team lead and already includes every table the plans need. If you really need a change, describe it in your PR (what field, and why). The lead adds it and its migration on `main`, and you merge `main` into your branch.
