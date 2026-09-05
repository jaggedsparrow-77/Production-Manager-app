# Callboard — working notes

Production management for theatre companies: shows, departments, schedules, meetings, budgets,
a decision log. Next.js 16 App Router · React 19 · TypeScript · Tailwind 4 · Postgres · Drizzle
· Auth.js · Vitest · Playwright.

Read [docs/architecture.md](docs/architecture.md) before making structural changes, and
[docs/adr/0004-callboard-domain.md](docs/adr/0004-callboard-domain.md) for why the domain is
shaped the way it is (it replaced an earlier generic project-board version of this app).

## Commands

```bash
npm run dev          # dev server
npm run verify        # format + lint + typecheck + unit tests — run before committing
npm run test          # unit tests only
npm run test:e2e      # Playwright (needs a seeded db)
npm run db:reset      # nuke, recreate, migrate, seed
npm run db:generate   # generate a migration after editing src/db/schema.ts
```

## Rules that matter here

**Authorization is organization-wide, in the data layer.** `src/proxy.ts` only sets headers — do
not move auth into it (see ADR 0003). Every mutation calls `requireOrgRole`; every query scopes
to the caller's `organizationId`. There is no per-show membership — every org member sees every
show; only role varies.

**Department budgets are derived, never stored on `department`.** A department's spend is the
sum of the `budget_line` rows whose `department_id` points at it — see the comment on the
`departments` table in `src/db/schema.ts`. Don't add budget columns back onto `department`.

**Mutations are server actions in `src/server/actions.ts`**, in this order: parse with a zod
schema from `src/lib/validation.ts` → authorize → mutate → `revalidatePath`. They return
`ActionState`, they do not throw (except `AuthorizationError`, caught by the `run()` wrapper).

**Toggle-open inline forms close via `useCloseFormOnSuccess`** (`src/hooks/`), not a
`useEffect` that calls `setState` — that trips the `react-hooks/set-state-in-effect` lint rule.
Follow the existing add-task/add-note/add-action forms as the pattern.

**Server components by default.** Add `"use client"` only for state, effects or handlers, and
push it to the smallest leaf.

**The design system lives in `src/app/globals.css`** — `.btn`, `.tag`, `.card`, `.table`,
`.dialog`, and the color/space tokens. Use those classes for reusable pieces; inline
`style={{}}` is the norm for one-off page layout here (ported that way from the source design
mockup — see ADR 0004), not a smell.

**`src/db/index.ts` is `server-only`.** Standalone scripts (`migrate.ts`, `seed.ts`) open their
own connection instead of importing it.

**Schema is the source of truth for types.** Import `Show`, `Department`, `MemberRole` etc. from
`src/db/schema.ts`; do not redeclare row shapes.

**Migrations are immutable once applied.** Fix a mistake with a new migration, never by editing
a file in `drizzle/`.

**New env var** → add to `.env.example`, validate in `src/env.ts`, add to
`.github/workflows/ci.yml` if tests need it.

## Gotchas

- `ALLOW_DEV_LOGIN` enables password-less sign-in. `src/env.ts` throws on boot if it is set
  with `NODE_ENV=production`, except during `next build` (which also runs as production but
  serves nothing). That guard is intentional — do not soften it further.
- Because dev-login is off under `NODE_ENV=production`, Playwright runs against `next dev` even
  in CI; the separate CI `build` job covers production compilation.
- Seed dates are computed relative to _when the seed runs_ (this week's Monday, etc.), not
  hardcoded — so the Overview tab's "Today" panel and "On now" badge always have something to
  show. Don't replace them with fixed calendar dates.
- Postgres runs on **5433** locally, not 5432, to avoid colliding with a host install.
- Auth.js v5 is pre-1.0; check the changelog on minor upgrades.
