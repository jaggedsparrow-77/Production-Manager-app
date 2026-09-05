# 1. Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-09-05

## Context

Decisions made early in a project — which ORM, how auth works, why sessions are JWTs — get
forgotten within months. The code shows _what_ was decided but rarely _why_, and the reasoning
is what a future maintainer needs when deciding whether a constraint still applies.

## Decision

Record significant architectural decisions as short markdown files in `docs/adr/`, numbered
sequentially, following Michael Nygard's format: Context, Decision, Consequences.

An ADR is warranted when a choice is expensive to reverse, constrains later work, or is
non-obvious enough that someone would otherwise re-litigate it. Routine choices do not need one.

ADRs are immutable once accepted. To change a decision, write a new ADR that supersedes it and
add a note to the old one.

## Consequences

- New contributors can read the ADR log to understand the shape of the system.
- A rejected alternative stays rejected for a documented reason, or is revisited deliberately.
- Small overhead per significant decision — roughly fifteen minutes of writing.
