# Architecture

## Shape of the app

A single Next.js application. There is no separate API service: React Server Components read
from Postgres directly, and server actions write to it. The network boundary is the server
component / client component split, not an HTTP API.

```
Browser
  │  form submission / navigation
  ▼
Next.js (App Router)
  ├── src/proxy.ts             security headers only
  ├── src/app/(app)/layout.tsx redirects signed-out users
  ├── src/server/queries.ts    reads   ─┐
  ├── src/server/actions.ts    writes  ─┼─► src/server/auth-guards.ts ─► Postgres
  └── src/auth.ts              sessions ┘        (Drizzle)
```

## Data model

Callboard is single-tenant per deployment: one **organization** (a theatre company), several
**shows** running at once, each show fanning out into its own departments, schedule, meetings
and budget.

```
organization ──< organization_member >── user
     │
     └──< show ──┬──< department ──┬──< department_note
                  │                 └──< department_doc
                  ├──< budget_line ──(optional FK)──► department
                  ├──< schedule_call
                  ├──< task
                  └──< meeting ──┬──< meeting_minute
                                 └──< meeting_action

organization ──< activity_entry >── show   (the decision log / feed)
```

- **organization_member** carries the role: `owner` > `admin` > `member` > `viewer`. There is no
  per-show membership — every member of the organization sees every show. What varies is what
  they're allowed to _do_.
- **department** deliberately has no budget columns. A department's spend is whatever
  `budget_line` rows point at it via `budget_line.department_id` — some budget lines (Contingency,
  Crew & overtime) fund no department at all, and a budget line's own display name doesn't have
  to match its department's ("AV & video" funds the "AV" department). Collapsing the two into one
  table would either lose that case or duplicate the figure in two places that can drift.
- **task** and **meeting_action** share a shape (label/text, an owner _name_ — not necessarily a
  user account, a due date, an optional flag, done/doneAt) because they're the same idea in two
  places: a lightweight per-show to-do list, and the action items that come out of a specific
  meeting.
- **activity_entry** is the organization-wide feed. Logging a decision from anywhere in the app
  writes one row here, tagged to a show and (as free text) a department.

## Authorization

Three layers, only two of which are load-bearing:

1. **`src/proxy.ts`** (Next 16's rename of `middleware.ts`) sets security headers. It does _not_
   authorize. It runs before the route and has no view of per-resource permissions, so treating
   it as the gate invites bypasses whenever a matcher pattern drifts.
2. **The `(app)` layout** calls `requireMembership()`, redirecting signed-out or membership-less
   users to `/login`. This is a routing convenience, not a security boundary.
3. **Every query and every action** authorizes independently, via `src/server/auth-guards.ts`.
   This is the real boundary: `requireOrgRole(minimum)` asserts the caller's organization role is
   at least `minimum`, and every show/department/meeting lookup is scoped to
   `organizationId` — a show id from another org's data resolves to `notFound()`, not a leak.

See [ADR 0003](adr/0003-authorization-in-the-data-layer.md) for why this shape was chosen, and
[ADR 0004](adr/0004-callboard-domain.md) for why authorization is organization-wide rather than
per-show (unlike the generic project-board version this app replaced).

### Roles

| Role     | Read | Toggle tasks, add notes/actions, log decisions | Create shows, manage members |
| -------- | :--: | :--------------------------------------------: | :--------------------------: |
| `viewer` |  ✓   |                                                |                              |
| `member` |  ✓   |                       ✓                        |                              |
| `admin`  |  ✓   |                       ✓                        |              ✓               |
| `owner`  |  ✓   |                       ✓                        |              ✓               |

## Sessions

JWT rather than database sessions. The dev-login Credentials provider cannot use database
sessions (an Auth.js constraint), and having local and deployed environments behave differently
is worse than the tradeoff.

## Request memoization

`getCurrentUserId`, `getMembership`, `getCurrentOrganization` and `listShowsForNav` are wrapped
in React's `cache()`. A single page render typically walks the `(app)` layout, a show's own
layout, and the page itself — each needing the session and the shows list — so without this,
every one of those would repeat the same DB round trip.

## Error handling

Server actions return `ActionState` (`{ ok, message?, errors? }`) instead of throwing, so forms
render failures inline through `useActionState`. `AuthorizationError` is caught by the `run()`
wrapper in `actions.ts` and becomes a message; anything unexpected propagates to the error
boundary, where Next.js has already replaced the message with a digest in production builds.

## The design system

`src/app/globals.css` is a near-verbatim port of the original design mockup's tokens and
component classes (`.btn`, `.tag`, `.card`, `.table`, `.dialog`, ...) — CSS custom properties for
color/space/radius, then plain classes built on them. Pages use those classes for reusable
pieces and inline `style={{}}` objects for one-off layout, mirroring how the mockup itself was
written, which made porting its markup close to mechanical. Archivo is loaded via `next/font/google`
rather than the mockup's embedded font files. Single light theme, by deliberate choice — see ADR 0004.

## Where things go

| Concern                         | Location                      |
| ------------------------------- | ----------------------------- |
| Table definitions and row types | `src/db/schema.ts`            |
| Input validation                | `src/lib/validation.ts`       |
| Reads                           | `src/server/queries.ts`       |
| Writes                          | `src/server/actions.ts`       |
| Permission checks               | `src/server/auth-guards.ts`   |
| Environment variables           | `src/env.ts` + `.env.example` |
| Design tokens & component CSS   | `src/app/globals.css`         |
| Shared UI primitives            | `src/components/ui/`          |
| Route-specific components       | Beside their `page.tsx`       |

## Known gaps

Deliberately not built yet, in rough priority order:

- **Real invitations.** `addOrganizationMember` requires the invitee to already have an account.
- **Editing shows/departments/budget lines/schedule calls** after creation — the "Add call",
  "Export CSV/PDF", "Circulate minutes" and template buttons are visibly disabled
  (`title="Not implemented yet"`) rather than silently doing nothing.
- **Document upload.** `department_doc` rows are metadata only; there's no file storage behind
  them yet.
- **Drag-and-drop scheduling** — the schedule is a read-only table.
- **Rate limiting** on mutations.
- **Structured logging and error reporting.**
