# Executable Reference Module

The template includes a small, framework-independent module at
`packages/reference`. It is intentionally concrete enough to run while
remaining generic enough to copy for a new business capability.

## Public seam

`ReferenceService` owns the use cases:

- create a reference entry
- retrieve one entry
- list active or archived entries
- archive an entry idempotently

The service accepts a `ReferenceEntryRepository` port. The repository currently
ships with `InMemoryReferenceEntryRepository`; an API adapter or a PostgreSQL
adapter can be added without making the domain depend on infrastructure.

## Layer ownership

```text
contracts  → JSON-safe input/output snapshots
domain     → validation and active/archived lifecycle
application → use cases and repository port
infrastructure → in-memory adapter
```

The executable behavior is covered by
`tests/unit/reference-module.test.ts`. The module is a reference seam, not a
claim that the template already contains a complete product API.
