# Production Manager — working notes

Project-management web app. Next.js 16 App Router · React 19 · TypeScript · Tailwind 4 ·
Postgres · Drizzle · Auth.js · Vitest · Playwright.

Read [docs/architecture.md](docs/architecture.md) before making structural changes.

## Commands

```bash
npm run dev          # dev server
npm run verify       # format + lint + typecheck + unit tests — run before committing
npm run test         # unit tests only
npm run test:e2e     # Playwright (needs a seeded db)
npm run db:reset     # nuke, recreate, migrate, seed
npm run db:generate  # generate a migration after editing src/db/schema.ts
```

## Rules that matter here

**Authorization is per-resource, in the data layer.** `src/proxy.ts` only sets headers — do not
move auth into it (see ADR 0003). Every query joins through `project_member`; every mutation
calls `requireProjectRole`. A new query without a membership join is a data leak.

**Never trust an id from a form.** Actions verify that a submitted `statusId` actually belongs
to the project it claims to. Same for any future cross-entity reference.

**Mutations are server actions in `src/server/actions.ts`**, in this order: parse with a zod
schema from `src/lib/validation.ts` → authorize → mutate → `revalidatePath`. They return
`ActionState`, they do not throw.

**Server components by default.** Add `"use client"` only for state, effects or handlers, and
push it to the smallest leaf — the whole page should not become a client component so one
button can have an `onClick`.

**`src/db/index.ts` is `server-only`.** Standalone scripts (`migrate.ts`, `seed.ts`) open their
own connection instead of importing it.

**Schema is the source of truth for types.** Import `Task`, `Project`, `MemberRole` from
`src/db/schema.ts`; do not redeclare row shapes.

**Migrations are immutable once applied.** Fix a mistake with a new migration, never by
editing a file in `drizzle/`.

**New env var** → add to `.env.example`, validate in `src/env.ts`, add to `.github/workflows/ci.yml`
if tests need it.

## Gotchas

- `ALLOW_DEV_LOGIN` enables password-less sign-in. `src/env.ts` throws on boot if it is set
  with `NODE_ENV=production`, except during `next build` (which also runs as production but
  serves nothing). That guard is intentional — do not soften it further.
- Because dev-login is off under `NODE_ENV=production`, Playwright runs against `next dev`
  even in CI; the separate CI `build` job covers production compilation.
- Task numbers are allocated by an atomic `UPDATE … RETURNING` inside the create transaction.
  Do not refactor it into a read-then-write.
- Postgres runs on **5433** locally, not 5432, to avoid colliding with a host install.
- Auth.js v5 is pre-1.0; check the changelog on minor upgrades.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
