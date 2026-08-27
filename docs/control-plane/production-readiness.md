# Control Plane Production Readiness

This runbook defines the provider-neutral production contract for the Harness
Control Plane. It does not provision a cloud service or replace an identity
provider.

## Required configuration

| Variable | Required | Purpose |
| --- | --- | --- |
| `NODE_ENV=production` | Yes | Enables production fail-closed checks |
| `HARNESS_CONTROL_PLANE_HOST` | Recommended | Bind address |
| `HARNESS_CONTROL_PLANE_PORT` | Recommended | Listen port |
| `HARNESS_CONTROL_PLANE_TOKEN` | Yes in production | Bearer token for application APIs |
| `HARNESS_CONTROL_PLANE_ORIGINS` | Yes in production | Comma-separated browser origin allowlist |
| `HARNESS_RUNTIME_STORE=postgres` | Yes for production state | Selects PostgreSQL adapter |
| `HARNESS_DATABASE_URL` | Required with PostgreSQL | Database connection URL |
| `HARNESS_DB_POOL_MAX` | Optional | Pool size, 1–100, default 10 |
| `HARNESS_DB_CONNECTION_TIMEOUT_MS` | Optional | Connection timeout, 100–120000 ms |
| `HARNESS_DB_IDLE_TIMEOUT_MS` | Optional | Idle pool timeout, 0–600000 ms |
| `HARNESS_CONTROL_PLANE_AUDIT_FILE` | Edge-managed | Mount/ship the JSONL audit sink when configured by deployment |

The application never logs bearer tokens, request bodies, database URLs, or
database credentials. Store secrets in the deployment secret manager and do
not put them in Git, workflow files, or command history.

## Release sequence

Run migrations as an explicit release step; the application does not migrate
automatically:

```bash
pnpm harness:runtime:check
pnpm db:migrate
pnpm db:check
pnpm harness:control:serve
```

Traffic may be sent to the instance only after `GET /ready` returns `200`.
`GET /health` is a liveness probe and does not prove that PostgreSQL is ready.
In PostgreSQL mode, readiness checks the database connection, migration
tracking table, and every repository migration currently shipped with the
artifact.

## Edge responsibilities

The application contract uses Bearer authentication and an explicit CORS
allowlist. The reverse proxy or identity edge remains responsible for:

- TLS termination and certificate rotation;
- OIDC/SSO identity mapping and RBAC;
- CSRF protection if the edge changes the contract to browser cookies;
- rate limiting, request filtering, and network policy;
- secret storage and rotation;
- shipping and rotating the JSONL audit stream to durable storage.

Do not expose the Control Plane directly to the public network without the
token, origin, TLS, and edge controls above.

## Backup and rollback

Take a database backup or snapshot before applying a migration. Migrations are
forward-only operational changes: deploy a backward-compatible application,
apply migrations, verify `/ready`, then shift traffic. If an application
rollout fails, drain traffic and restore the previous application artifact;
repair an incompatible schema with a forward migration rather than applying an
unreviewed destructive down migration.

Validate restore procedures against a non-production database regularly. The
event store and audit records are operational history and must be included in
the backup and durable shipping policy.

## Incident checks

1. Check `/health` to distinguish a stopped process from a dependency issue.
2. Check `/ready` and inspect only the safe `checks`/`reason` fields.
3. Run `pnpm db:check` with the deployment database URL to identify pending
   migrations without printing the connection URL.
4. Confirm the edge identity, origin, TLS, and rate-limit policy.
5. Inspect structured request/error logs and the durable audit sink using the
   request id; never request credentials or raw request bodies for diagnosis.
