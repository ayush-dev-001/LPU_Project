# Build plans

Each plan is one feature branch and one PR. How to use a plan:

1. `git checkout main && git pull && git checkout -b <branch from the plan>`
2. Give your AI assistant **`CONTRIBUTING.md` + your plan file**, and ask it to implement the plan.
3. Check every acceptance criterion yourself, logged in as the demo users.
4. `npm run check`, push, and open a PR into `main`.

| # | Plan | Branch | Owner | Can start |
|---|---|---|---|---|
| 01 | [Projects, members & milestones](01-projects-milestones.md) | `feature/projects-milestones` | Teammate A | Now |
| 02 | [Tasks: Kanban, timeline, My tasks](02-tasks-board.md) | `feature/tasks-board` | Teammate A | After 01 is merged |
| 03 | [Progress updates & budget](03-updates-budget.md) | `feature/updates-budget` | Teammate B | Now |
| 04 | [Documents, notifications & reports](04-documents-notifications-reports.md) | `feature/documents-notifications-reports` | Teammate B | After 03 is merged |
| — | Dashboard & health score | `feature/dashboard` | Lead | Now |
