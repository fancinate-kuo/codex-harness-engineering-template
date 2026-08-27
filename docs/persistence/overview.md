# PostgreSQL Persistence Layer

v17 introduces a durable persistence layer for multi-user and multi-machine operation.

## What Moves to PostgreSQL

Operational state:
- tasks
- DAG runs
- node runs
- approvals
- audit events
- metrics
- token/cost telemetry
- feedback events
- memory records
- event stream

## What Stays in Git

Portable repository configuration:
- AGENTS.md
- architecture docs
- policies
- node catalog
- workflow templates
- benchmark definitions
- memory policy
- graph overlays
- schemas

Git remains the source of truth for repository configuration.
PostgreSQL becomes the source of truth for runtime operational state.

## Runtime store selection

The Control Plane uses one `RuntimeReadModel` interface and selects its
adapter with `HARNESS_RUNTIME_STORE`:

```text
HARNESS_RUNTIME_STORE=filesystem  # local/offline fallback
HARNESS_RUNTIME_STORE=postgres    # production; requires HARNESS_DATABASE_URL
```

When the variable is omitted, a configured `HARNESS_DATABASE_URL` selects the
PostgreSQL adapter; otherwise filesystem mode is selected. Invalid or partial
PostgreSQL configuration fails during startup instead of silently falling back.

Run `pnpm harness:runtime:check` to inspect the selected mode.
Run `pnpm db:check` after migrations to verify connectivity, the migration
tracking table, and that every repository migration is applied.
