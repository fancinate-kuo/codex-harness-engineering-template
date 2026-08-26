# Filesystem Fallback

Filesystem mode remains useful for:
- local demos
- repo templates
- offline development
- reproducible examples

Production mode should prefer PostgreSQL.

The same logical entities should be readable from either backend through a repository abstraction.

The adapter is selected explicitly with `HARNESS_RUNTIME_STORE`. Filesystem
mode is the default only when no database URL is configured, so a production
deployment cannot accidentally request PostgreSQL without a connection URL.
