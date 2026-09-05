# Callboard

Production management for theatre companies: shows, department budgets, production schedules,
production meetings with minutes and actions, and a running decision log.

**Stack** — Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Postgres · Drizzle ORM · Auth.js · Vitest · Playwright

---

## Quick start

Requires Node 22.12+ (see `.nvmrc`) and Docker.

```bash
npm install                  # install dependencies
cp .env.example .env.local   # create local config
npx auth secret              # writes AUTH_SECRET into .env.local

npm run db:up                # start Postgres on :5433
npm run db:migrate           # apply migrations
npm run db:seed              # load Northern Rep, a seeded theatre company

npm run dev                  # http://localhost:3000
```

Sign in at `/login` with `producer@northernrep.example` — the seeded dev sign-in needs no
password. It is disabled in production (the app refuses to boot if `ALLOW_DEV_LOGIN` is set
there).

## Scripts

| Command               | What it does                                   |
| --------------------- | ---------------------------------------------- |
| `npm run dev`         | Dev server with hot reload                     |
| `npm run build`       | Production build                               |
| `npm run verify`      | Format check + lint + typecheck + unit tests   |
| `npm run test`        | Vitest unit tests                              |
| `npm run test:watch`  | Vitest in watch mode                           |
| `npm run test:e2e`    | Playwright end-to-end tests                    |
| `npm run lint:fix`    | ESLint with autofix                            |
| `npm run format`      | Prettier write                                 |
| `npm run db:up`       | Start the Postgres container                   |
| `npm run db:generate` | Generate a migration from schema changes       |
| `npm run db:migrate`  | Apply pending migrations                       |
| `npm run db:seed`     | Reseed Northern Rep's sample season            |
| `npm run db:studio`   | Drizzle Studio, a browser UI for the database  |
| `npm run db:reset`    | Destroy the volume, recreate, migrate and seed |

`npm run verify` is what CI runs first — run it before pushing.

## The domain

One theatre company (an **organization**) runs several **shows** at once. Each show has:

- **Departments** (Lighting, Sound, AV, Staging, Costume, ...) with notes and documentation
- A **production schedule** of calls (get-in, rig, tech, dress, press night, ...)
- **Production meetings**, each with numbered **minutes** and a list of **actions**
- A **budget**, broken into lines that may or may not fund a specific department
- **Key tasks** — a lightweight per-show to-do list

Every organization member sees every show; what varies is _role_ (owner/admin/member/viewer).
Signed-in members can log a **decision** from anywhere in the app — it lands in the portfolio's
activity feed, tagged to a show and department.

See [docs/architecture.md](docs/architecture.md) for the full data model and
[docs/adr/0004-callboard-domain.md](docs/adr/0004-callboard-domain.md) for how this domain was
derived from the design mockup, including where the real app deliberately diverges from it.

## Project layout

```
src/
  app/                  Routes (App Router)
    (app)/              Signed-in shell: shows, company
      shows/[id]/       Overview · schedule · meetings · budget · departments
    login/              Sign-in page
    api/auth/           Auth.js route handlers
  components/           Shared UI: design-system primitives, nav, dialogs
  db/
    schema.ts           Drizzle schema — the single source of truth for tables
    index.ts            Pooled client (server-only)
    migrate.ts, seed.ts Standalone scripts
  lib/                  Client-safe helpers: validation, constants, utils
  server/
    auth-guards.ts      Session + organization-role checks
    queries.ts          Reads, scoped to the caller's organization
    actions.ts          Server actions (mutations)
  env.ts                Validated environment
  proxy.ts              Security headers (Next 16's renamed middleware.ts)
drizzle/                Generated SQL migrations (committed)
tests/e2e/              Playwright specs
docs/                   Architecture notes and ADRs
```

## How the pieces fit

- **Reads** live in `src/server/queries.ts` and always scope to the caller's organization.
- **Writes** live in `src/server/actions.ts`. Every action parses `FormData` with a zod schema,
  authorizes with `requireOrgRole`, mutates, then revalidates.
- **Authorization is never in `proxy.ts`.** It sets security headers only; it cannot see whether
  _this_ user may touch _this_ show. See [docs/architecture.md](docs/architecture.md).
- **The design system** (colors, type, `.btn`/`.tag`/`.card`/`.table`/`.dialog` classes) lives in
  `src/app/globals.css`, ported from the original design mockup — see ADR 0004.

## Changing the database

```bash
# 1. Edit src/db/schema.ts
npm run db:generate    # 2. Writes SQL into drizzle/
npm run db:migrate     # 3. Apply locally
```

Commit the generated file in `drizzle/`. Never hand-edit an already-applied migration.

## Deployment

Set in the host's environment: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, and the GitHub OAuth
pair. Leave `ALLOW_DEV_LOGIN` unset. Run `npm run db:migrate` as a release step before the new
version starts serving.

## Further reading

- [docs/architecture.md](docs/architecture.md) — data model, auth model, conventions
- [docs/adr/](docs/adr/) — why the stack — and the domain — are what they are
- [CONTRIBUTING.md](CONTRIBUTING.md) — workflow and conventions
