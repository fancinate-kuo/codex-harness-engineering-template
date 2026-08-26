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
