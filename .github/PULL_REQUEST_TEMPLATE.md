## What changed

<!-- One or two sentences. Link the issue if there is one. -->

## Why

<!-- The problem this solves, not a restatement of the diff. -->

## How to verify

<!-- Steps a reviewer can follow locally. -->

## Checklist

- [ ] `npm run verify` passes (format, lint, types, unit tests)
- [ ] New behaviour has a test
- [ ] Schema changes include a generated migration (`npm run db:generate`)
- [ ] Any new env var is documented in `.env.example` and validated in `src/env.ts`
- [ ] Mutations authorize the caller via `requireProjectRole`
