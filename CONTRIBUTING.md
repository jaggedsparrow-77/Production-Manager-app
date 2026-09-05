# Contributing

## Workflow

1. Branch from `main`: `feat/short-description`, `fix/…`, `chore/…`, `docs/…`
2. Make the change, with a test for any new behaviour.
3. `npm run verify` — format, lint, types, unit tests.
4. Open a PR. CI runs the same checks plus e2e and a production build.

`main` is protected: merge through a PR, never push directly.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/):

```
feat(schedule): add a full-week view alongside Today
fix(auth): redirect to the requested page after sign-in
chore(deps): bump drizzle-orm to 0.45
docs(readme): document the seed workflow
```

The subject line is imperative and under ~72 characters. Explain _why_ in the body when the
reason is not obvious from the diff.

## Conventions

**Server vs client.** Components are server components by default. Add `"use client"` only when
you need state, effects, or event handlers — and push it as far down the tree as possible so
the interactive leaf, not the whole page, ships to the browser.

**Every mutation is a server action.** In `src/server/actions.ts`, following the same three
steps: parse with zod → authorize with `requireOrgRole` → mutate and revalidate. Actions return
`ActionState` rather than throwing, so forms can render errors inline.

**Never trust an id from the client.** A form can submit any UUID. Actions and queries scope
every lookup to the caller's `organizationId` (see `requireOrgRole`/`requireMembership` in
`src/server/auth-guards.ts`), so an id for another org's data resolves to nothing rather than
leaking it.

**A toggle-open inline form closes itself via `useCloseFormOnSuccess`**
(`src/hooks/use-close-form-on-success.ts`), not a `useEffect` that calls `setState` on success —
the latter trips the `react-hooks/set-state-in-effect` lint rule. Copy the pattern from an
existing form (e.g. `add-task-form.tsx`) rather than reinventing it.

**Validation lives in `src/lib/validation.ts`** — a client-safe module with no database
imports, so forms and actions share one definition of what valid input means.

**Database access is server-only.** `src/db/index.ts` imports `server-only`; importing it from
a client component is a build error rather than a leaked connection string.

**Types come from the schema.** Import `Show`, `Department`, `MemberRole` and friends from
`src/db/schema.ts` instead of hand-writing row shapes.

**Department budgets are derived, not stored.** Don't add budget columns back onto
`department` — see the comment on that table in `src/db/schema.ts`.

**New environment variables** go in three places: `.env.example` (documented), `src/env.ts`
(validated), and the CI workflow if tests need them.

## Testing

- **Unit tests** (`*.test.ts` beside the source) cover pure logic — validation schemas,
  helpers, presentational components. Fast, no database.
- **End-to-end tests** (`tests/e2e/`) cover real user journeys through a running app.
  `smoke.spec.ts` needs no data; `shows.spec.ts` needs a seeded database.

Test behaviour, not implementation. Prefer `getByRole` over test ids — it exercises the
accessibility tree at the same time.

## Database changes

```bash
npm run db:generate   # after editing src/db/schema.ts
npm run db:migrate
```

Commit the generated SQL. Once a migration has been applied anywhere it is immutable — fix
mistakes with a new migration.
