# 3. Authorization lives in the data layer, not middleware

- **Status:** Accepted
- **Date:** 2026-09-05

## Context

Next.js middleware — renamed `proxy.ts` in Next 16 — is the conventional place to put auth
checks, and most tutorials do exactly that: match protected routes, verify a session, redirect
otherwise.

That works for "is anyone signed in?" It does not work for "may _this_ user do _this_", which is
the question that actually matters: every mutation is gated by the caller's role, and every show
belongs to an organization the caller must actually be a member of.

Middleware-as-gate also fails in ways that are hard to notice: a matcher pattern that stops
matching a newly added route silently exposes it, and middleware runs on a runtime without
database access in some deployment targets, so the check would have to be based on the token
alone.

## Decision

`src/proxy.ts` sets security headers and nothing else. Authorization happens in
`src/server/auth-guards.ts` and is invoked by every query and every mutation:

- `getCurrentUserId()` / `requireUserId()` — session, redirecting to `/login` when absent.
- `getMembership(userId)` — the caller's organization and role, or `null`.
- `requireOrgRole(minimum)` — asserts at least `minimum`, throwing `AuthorizationError`
  otherwise (for mutations, which turn it into a form error rather than a redirect).
- `requireMembership(minimum)` — the same check, but redirects to `/login` instead of throwing
  (for pages, which have nowhere to render a form error).

Every show/department/meeting/budget-line lookup scopes to `organizationId` in the query itself,
so a show id from another org's data — there normally isn't one, but a stale link or a
copy-pasted id should still fail closed — resolves to `notFound()`, not a leak.

The `(app)` layout still calls `requireMembership()`, but as a routing convenience — it sends
signed-out users somewhere useful. It is not relied on for safety.

## Consequences

- Adding a route cannot accidentally expose data: a new page has to call a query, and every
  query authorizes.
- The check is duplicated per entry point rather than centralised. That repetition is
  deliberate — a forgotten call fails closed (no data) rather than open.
- Slightly more database work per request: a membership lookup alongside the main query. React's
  `cache()` collapses repeats of that lookup within one render — see
  [ADR 0004](0004-callboard-domain.md) — so the cost is one round trip per request, not one per
  component.
- Non-members receive 404, not 403, so the existence of a show is not disclosed.

## Update — 2026-09-05

This ADR originally described a per-_project_ membership model, from an earlier generic
task-board version of this app. The principle — authorization in the data layer, never in
middleware — is unchanged and is why this ADR wasn't rewritten from scratch. The specifics
above now reflect Callboard's actual model: organization-wide membership with a role, not
per-resource membership. See [ADR 0004](0004-callboard-domain.md).
