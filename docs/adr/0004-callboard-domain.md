# 4. Adopting the Callboard domain from the design mockup

- **Status:** Accepted
- **Date:** 2026-09-05

## Context

This repository started as a generic project/task board (projects, board columns, tasks,
comments) built from a one-line request. The user then supplied a Claude Design mockup —
"Callboard", for a fictional theatre company ("Northern Rep") — covering a portfolio of shows,
per-department budgets and notes, a production schedule, production meetings with minutes and
actions, and a decision log. That mockup is a different, more specific product than the generic
board, not a visual restyling of it.

Asked to choose, the user confirmed: replace the generic domain outright, and seed the mockup's
own content (Northern Rep, The Winter's Tale, PM4–PM7) as real database rows rather than a
blank slate.

## Decision

**The domain became Callboard's**, in full: `organization`, `show`, `department` (+ notes,
docs), `budget_line`, `schedule_call`, `task`, `meeting` (+ minutes, actions), `activity_entry`.
The prior `project`/`task_status`/generic `task`/`comment` tables were dropped rather than kept
alongside.

**Membership became organization-wide, not per-show.** The mockup shows no per-show access
control at all — every signed-in person sees every show, and what differs is role
(owner/admin/member/viewer). Modeling per-show membership anyway would have added a whole join
the product never asks for. See [ADR 0003](0003-authorization-in-the-data-layer.md).

**Department budgets are derived, not stored.** The mockup's own numbers make this the correct
model: a department's budget/spend in its status card are _exactly_ the sum of the budget-line
row(s) that fund it (verified against every figure in the mockup's source). Storing both would
let them drift; `budget_line.department_id` links them explicitly instead of matching on name
(needed because a line's display name doesn't always equal its department's — "AV & video"
funds "AV").

**Tabs became routes, not client-side state.** The mockup is a single-page client component
switching on `state.tab`; the real app uses nested App Router segments
(`/shows/[id]/schedule`, `/shows/[id]/meetings/[meetingId]`, ...) so each view is bookmarkable,
back-button-correct, and server-rendered.

**Dates are computed relative to the seed run, not hardcoded.** The mockup's "today" is a fixed
point in its fictional 2025/26 season. Seeding literal historical dates would leave the
Overview tab's "Today" panel and "On now" badge permanently empty once real time moved past
them. `src/db/seed.ts` instead anchors the schedule to the current week, so the app looks live
whenever it's actually run.

**The mockup's own cross-show data bleed was corrected, not replicated.** In the mockup, the
Budget/Departments/Meetings/Schedule tabs render the _same_ hardcoded content regardless of
which show is selected — a static prototype only fully fleshing out one example. The real app
properly scopes every one of those to the show in the URL; the seed gives the other three shows
lighter but genuinely distinct content specifically to prove that isolation.

**Decorative-but-unwired buttons stayed decorative — visibly.** "Export schedule", "Add call",
"Export CSV", "Download PDF", "Circulate minutes" and the two sidebar template buttons have no
`onClick` in the mockup either. Rather than inventing functionality out of scope for this pass,
they render `disabled` with `title="Not implemented yet"`, so nothing looks wired that isn't.

**The design system was ported close to verbatim.** Tokens and component classes
(`.btn`/`.tag`/`.card`/`.table`/`.dialog`) moved into `src/app/globals.css` largely unchanged;
Archivo loads via `next/font/google` instead of the mockup's embedded font files. Single light
theme, matching the mockup's own choice, rather than adding a dark variant it never specified.

**`getCurrentUserId`, `getMembership`, `getCurrentOrganization` and `listShowsForNav` are
wrapped in React's `cache()`.** A single page render walks the `(app)` layout, a show's own
layout, and the page itself — each needing the session, membership and shows list — so without
memoization each would re-run the same query.

## Consequences

- Nothing from the prior generic-board version survived in the schema; its ADRs (0001–0003)
  were kept where the underlying principle still holds (record decisions; data-layer auth) and
  updated in place where only the domain's nouns had gone stale.
- The mockup's exact numbers are reproducible in the seed (Winter's Tale's budget, minutes and
  tasks), which doubled as a correctness check on the schema — every cross-referenced figure in
  the mockup had to add up under the new model before the seed was considered right.
- Real gaps remain and are listed in docs/architecture.md's "Known gaps": no document upload
  behind `department_doc`, no editing of shows/departments/budget lines after creation, no
  drag-and-drop schedule.
