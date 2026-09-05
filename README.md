# Production Manager

A project-management web app: projects, board columns, tasks, assignees and comments.

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
npm run db:seed              # load sample projects and tasks

npm run dev                  # http://localhost:3000
```

Sign in at `/login` with `ada@example.com` — the seeded dev sign-in needs no password. It is
disabled in production (the app refuses to boot if `ALLOW_DEV_LOGIN` is set there).

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
| `npm run db:seed`     | Reseed sample data                             |
| `npm run db:studio`   | Drizzle Studio, a browser UI for the database  |
| `npm run db:reset`    | Destroy the volume, recreate, migrate and seed |

`npm run verify` is what CI runs first — run it before pushing.

## Project layout

```
src/
  app/                  Routes (App Router)
    (app)/              Signed-in shell: projects, tasks, my-tasks
    login/              Sign-in page
    api/auth/           Auth.js route handlers
  components/ui/        Presentational primitives
  db/
    schema.ts           Drizzle schema — the single source of truth for tables
    index.ts            Pooled client (server-only)
    migrate.ts, seed.ts Standalone scripts
  lib/                  Client-safe helpers: validation, constants, utils
  server/
    auth-guards.ts      Session + per-project role checks
    queries.ts          Reads, scoped to the caller's membership
    actions.ts          Server actions (mutations)
  env.ts                Validated environment
  proxy.ts              Security headers (Next 16's renamed middleware)
drizzle/                Generated SQL migrations (committed)
tests/e2e/              Playwright specs
docs/                   Architecture notes and ADRs
```

## How the pieces fit

- **Reads** live in `src/server/queries.ts` and always join through `project_member`, so a
  page cannot leak another workspace's data by passing an id from the URL.
- **Writes** live in `src/server/actions.ts`. Every action parses `FormData` with a zod schema,
  authorizes with `requireProjectRole`, mutates, then revalidates.
- **Authorization is never in `proxy.ts`.** It sets security headers only; it cannot see
  whether _this_ user may touch _this_ project. See [docs/architecture.md](docs/architecture.md).

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
- [docs/adr/](docs/adr/) — why the stack is what it is
- [CONTRIBUTING.md](CONTRIBUTING.md) — workflow and conventions
