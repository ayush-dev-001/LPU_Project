## What this PR does

<!-- One or two sentences. Which plan in docs/plans/ does it implement? -->

Plan: `docs/plans/...`

## Screenshots

<!-- At least one screenshot per new page, desktop width. Add phone width if layout differs. -->

## Checklist

- [ ] `npm run check` passes locally (lint + types + build)
- [ ] Every acceptance criterion in the plan is done (or listed below as not done)
- [ ] Tested as **admin**, **manager** and **member**: a member cannot perform manager-only actions
- [ ] Every server action calls `requireUser()` / `getProjectAccess()` and validates input with Zod
- [ ] Only touched files my plan owns (or explained why below)
- [ ] No `.env`, secrets, `uploads/` or `console.log` debugging left in

## Not done / known issues

<!-- Anything from the plan you skipped, and why. -->

## Requests for the lead

<!-- Schema changes, new shared components or helpers, new npm packages. -->
