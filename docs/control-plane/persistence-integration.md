# Control Plane Persistence Integration

v17 introduces database repositories but keeps filesystem read-model compatibility.

Runtime store transition:

1. set `HARNESS_RUNTIME_STORE=postgres` with `HARNESS_DATABASE_URL`
2. run `pnpm db:migrate` and `pnpm db:seed`
3. persist an initial snapshot with `pnpm harness:persist:snapshot TASK-001`
4. Control Plane reads use the PostgreSQL adapter while repository configuration
   remains in Git
5. keep filesystem mode for local/offline fallback and parity checks

The Control Plane does not access PostgreSQL directly. It uses the
`RuntimeReadModel` seam, which selects either the filesystem adapter or the
PostgreSQL adapter at startup. Task leases and idempotency keys are stored in
PostgreSQL so multiple schedulers can coordinate without sharing local files.
