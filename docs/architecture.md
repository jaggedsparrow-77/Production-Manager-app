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

```
user ──┬─< project_member >── project ──< task_status
       │                          │            │
       │                          └──< task >──┘
       │                                 │
       ├──< task.assignee_id             │
       └──< comment.author_id >── comment ┘
```

- **project** owns a `key` (`WEB`) and a `task_counter`. Task numbers are per-project, so
  tasks are referenced as `WEB-42` rather than by UUID.
- **project_member** carries the role: `owner` > `admin` > `member` > `viewer`. Membership is
  the unit of access — there are no global admins.
- **task_status** is a board column. Users rename and reorder them, so reporting keys off
  `category` (`backlog` / `active` / `done`) rather than the display name.
- **task.position** orders cards within a column; **task_status.position** orders the columns.

### Why task numbers are allocated in a transaction

`createTask` increments `project.task_counter` with `SET task_counter = task_counter + 1
RETURNING`, inside the same transaction as the insert. Reading the counter and then writing it
back would let two concurrent creates claim the same number; the unique index on
`(project_id, number)` would then reject one of them.

## Authorization

Three layers, only two of which are load-bearing:

1. **`src/proxy.ts`** (Next 16's rename of `middleware.ts`) sets security headers. It does
   _not_ authorize. It runs before the route and has no view of per-resource permissions, so
   treating it as the gate invites bypasses whenever a matcher pattern drifts.
2. **The `(app)` layout** calls `requireUserId()`, redirecting signed-out users to `/login`.
   This is a routing convenience, not a security boundary.
3. **Every query and every action** authorizes independently, via `src/server/auth-guards.ts`.
   This is the real boundary. A query that forgets to join through `project_member` is a data
   leak regardless of what the layers above did.

Non-members get a 404 rather than a 403: whether a project exists is itself private.

### Roles

| Role     | Read | Create/edit tasks | Manage members & settings |
| -------- | :--: | :---------------: | :-----------------------: |
| `viewer` |  ✓   |                   |                           |
| `member` |  ✓   |         ✓         |                           |
| `admin`  |  ✓   |         ✓         |             ✓             |
| `owner`  |  ✓   |         ✓         |             ✓             |

`requireProjectRole(projectId, "member")` asserts _at least_ that rank via `ROLE_RANK`.

## Sessions

JWT rather than database sessions. The dev-login Credentials provider cannot use database
sessions (an Auth.js constraint), and having local and deployed environments behave
differently is worse than the tradeoff. If dev login is removed later, switching to
`strategy: "database"` is a one-line change plus a session-table cleanup.

## Error handling

Server actions return `ActionState` (`{ ok, message?, errors? }`) instead of throwing, so
forms render failures inline through `useActionState`. `AuthorizationError` is caught by the
`run()` wrapper and becomes a message; anything unexpected propagates to the error boundary,
where Next.js has already replaced the message with a digest in production builds.

## Where things go

| Concern                         | Location                      |
| ------------------------------- | ----------------------------- |
| Table definitions and row types | `src/db/schema.ts`            |
| Input validation                | `src/lib/validation.ts`       |
| Reads                           | `src/server/queries.ts`       |
| Writes                          | `src/server/actions.ts`       |
| Permission checks               | `src/server/auth-guards.ts`   |
| Environment variables           | `src/env.ts` + `.env.example` |
| Presentational components       | `src/components/ui/`          |
| Route-specific components       | Beside their `page.tsx`       |

## Known gaps

Deliberately not built yet, in rough priority order:

- **Real invitations.** `addProjectMember` requires the invitee to already have an account.
- **Drag-and-drop board.** Moving a card uses a select + submit, which works without
  JavaScript. Drag-and-drop should layer on top rather than replace it.
- **Task editing UI.** `updateTask` and `deleteTask` exist and are tested by type-checking,
  but no page calls them yet.
- **Rate limiting** on mutations.
- **Audit trail** for status changes.
- **Structured logging and error reporting.**
