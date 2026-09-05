# 3. Authorization lives in the data layer, not middleware

- **Status:** Accepted
- **Date:** 2026-09-05

## Context

Next.js middleware — renamed `proxy.ts` in Next 16 — is the conventional place to put auth
checks, and most tutorials do exactly that: match protected routes, verify a session, redirect
otherwise.

That works for "is anyone signed in?" It does not work for "may _this_ user read _this_
project?", which is the only question that matters here — every resource is scoped to a
project membership with a role.

Middleware-as-gate also fails in ways that are hard to notice: a matcher pattern that stops
matching a newly added route silently exposes it, and middleware runs on a runtime without
database access in some deployment targets, so the check would have to be based on the token
alone.

## Decision

`src/proxy.ts` sets security headers and nothing else. Authorization happens in
`src/server/auth-guards.ts` and is invoked by every query and every mutation:

- `requireUserId()` — session, redirecting to `/login` when absent.
- `getProjectRole(projectId, userId)` — the caller's role, or `null`.
- `requireProjectRole(projectId, minimum)` — asserts at least `minimum`, throws otherwise.

Reads additionally join through `project_member` in the query itself, so scoping is part of
the SQL rather than a check that can be forgotten around it.

The `(app)` layout still calls `requireUserId()`, but as a routing convenience — it sends
signed-out users somewhere useful. It is not relied on for safety.

## Consequences

- Adding a route cannot accidentally expose data: a new page has to call a query, and every
  query authorizes.
- The check is duplicated per entry point rather than centralised. That repetition is
  deliberate — a forgotten call fails closed (no data) rather than open.
- Slightly more database work per request: a membership lookup alongside the main query. At
  this scale it is a single indexed read on the `project_member` primary key.
- Non-members receive 404, not 403, so the existence of a project is not disclosed.
