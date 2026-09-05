# 2. Next.js, Postgres and Drizzle

- **Status:** Accepted
- **Date:** 2026-09-05

## Context

A project-management app is CRUD over a relational domain — projects, tasks, members,
comments — with real-time-ish collaboration desirable later. It needs authentication,
authorization scoped per project, and a UI with meaningful interactivity on a few surfaces
(forms, boards) but mostly server-rendered content.

## Decision

**Next.js (App Router) as one full-stack application.** Server components read from the
database directly, so there is no hand-written API layer to keep in sync with the UI, and no
duplicated request/response types. The alternative — a separate SPA plus an API service —
buys deployment independence we do not need at this size and costs a serialization boundary
we would maintain by hand.

**Postgres, self-hosted via Docker locally.** The domain is relational: tasks belong to
projects, membership gates access, reporting means aggregate queries across joins. Postgres
also gives transactions, which the task-number allocation depends on for correctness.

**Drizzle as the ORM.** The schema is TypeScript, so row types are inferred rather than
generated, and the query builder stays close enough to SQL that a complex aggregate is
readable. Migrations are plain SQL files, generated and committed — reviewable in a PR and
runnable by any Postgres client if the tooling ever goes away. Prisma was the main
alternative; it has a larger ecosystem, but its heavier runtime and generated-client step buy
less than the SQL transparency costs.

**Auth.js with the Drizzle adapter.** Standard provider integrations without hosting an
identity service. Chosen over Clerk/Auth0 to avoid a vendor dependency for something this
application does not differentiate on.

**Tailwind CSS.** Styling co-located with markup, no separate stylesheet to keep in sync, and
no runtime cost.

## Consequences

- Business logic runs on the server by default; anything reaching the client must be marked
  `"use client"` explicitly, which keeps bundles small but requires discipline about where
  state lives.
- Self-hosted Postgres means we own migrations, backups and connection pooling. Docker Compose
  covers local development; production needs a managed instance.
- Auth.js v5 is still pre-1.0. The surface we use (providers, adapter, JWT sessions) is
  stable, but minor upgrades warrant reading the changelog.
- No vendor lock-in: the app is a standard Node process against a standard Postgres, so it
  deploys to Vercel, Fly, Railway or a container platform without changes.
