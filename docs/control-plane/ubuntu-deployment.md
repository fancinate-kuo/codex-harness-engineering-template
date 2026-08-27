# Ubuntu Deployment Target

The first operational deployment target is a single Ubuntu 24.04 LTS host:

```text
Internet → Caddy (TLS, headers, request limit) → 127.0.0.1:4317
                                      └→ Harness Control Plane → PostgreSQL 16
```

The application process is managed by systemd. SOPS/age encrypts the JSON
secret documents at rest; the small runtime adapters decrypt them in memory and
pass only an allow-listed environment to the application and backup processes.
Vector uses its exec secret backend to request only the two audit values it
needs; those values are not placed in the Vector process environment. No
encrypted secret file or age private key belongs in Git.

## Prerequisites

- Ubuntu 24.04 LTS with systemd and an unprivileged `harness` user;
- Node.js 22, pnpm 10, Caddy 2.10 or newer, Vector, SOPS, age, restic, and
  PostgreSQL client tools;
- a PostgreSQL 16 database reachable over TLS;
- an HTTPS audit endpoint that returns 2xx only after durably accepting the
  JSON audit event;
- a restic repository backed by durable encrypted storage.

Install the checked-in units and configuration from `deploy/ubuntu/` into
`/etc/systemd/system`, `/etc/caddy`, and `/etc/vector`. Keep the application
release at `/srv/harness/current` and mount writable runtime paths at:

- `/var/lib/harness/audit` — application JSONL audit events;
- `/var/lib/harness/backups` — local PostgreSQL custom-format dumps;
- `/var/lib/vector` — Vector disk buffer for at-least-once audit shipping.

The application user must be able to read the encrypted secret documents and
the age key, while only the application/vector service accounts can read the
decrypted runtime data. Use `0750` directories and `0640`/`0600` files.

## Secret lifecycle

Create an example JSON document from the checked-in files, replace every
placeholder locally, and encrypt it with the deployment recipient:

```bash
sops --encrypt --input-type json --output-type json --age "$AGE_RECIPIENT" \
  deploy/ubuntu/secrets/control-plane.json.example \
  > /etc/harness/secrets/control-plane.json.enc
```

Repeat for `audit-sink.json.example` and `restic.json.example`. The systemd
units set `SOPS_AGE_KEY_FILE` and invoke the runtime adapters with
`shell: false`; decryption failures stop the unit and emit only a safe error
code. The Vector exec backend receives a small JSON request over stdin and
returns only the allow-listed requested values. Rotate a secret by writing a
new encrypted document, validating it on a maintenance instance, then
restarting the affected unit.

## Edge and application startup

Set `HARNESS_PUBLIC_HOST` and `HARNESS_ACME_EMAIL` in the Caddy service
environment, then validate and reload the Caddyfile:

```bash
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo systemctl reload caddy
```

Caddy terminates TLS, adds security headers, caps request bodies, binds the
application upstream to loopback, and removes authorization/cookie/query data
from access logs. The application still enforces its Bearer token and explicit
origin allowlist. Expose only ports 80/443 at the host firewall; do not expose
4317 publicly.

Start the application only after the explicit database release sequence:

```bash
sudo systemctl daemon-reload
pnpm db:migrate
pnpm db:check
sudo systemctl enable --now harness-control-plane.service
sudo systemctl enable --now harness-audit-shipper.service
sudo systemctl enable --now harness-postgres-backup.timer
curl --fail http://127.0.0.1:4317/ready
```

For a new release, run `db:migrate` and `db:check` before shifting traffic.
`/health` proves process liveness; `/ready` proves configuration and database
readiness.

## Audit shipping

Vector tails `/var/lib/harness/audit/control-plane.jsonl` and sends gzip JSON
events to `HARNESS_AUDIT_SINK_URL` with `HARNESS_AUDIT_SINK_TOKEN`. Its disk
buffer blocks rather than dropping events when the sink is unavailable. The
sink contract must provide authenticated HTTPS, durable append before 2xx, and
an operator-visible retention policy. Monitor Vector restart count, buffer
growth, and sink response failures.

## Backup and restore

The daily systemd timer runs `pg_dump` with a temporary mode `0600` passfile,
writes an atomic custom-format dump, creates a SHA-256 sidecar, and then runs
restic against both the database dump and the application audit directory.
Database credentials never appear in command arguments or logs.

Run an on-demand backup:

```bash
sudo systemctl start harness-postgres-backup.service
restic snapshots
```

Restore is deliberately manual and requires two confirmations. First restore
the selected restic snapshot to a quarantine directory, validate its checksum,
then restore the dump during a maintenance window:

```bash
export HARNESS_RESTORE_CONFIRM=YES
node deploy/ubuntu/bin/restic-backup.mjs restore latest /var/lib/harness/restore --confirm
HARNESS_BACKUP_DIR=/var/lib/harness/restore/var/lib/harness/backups \
node deploy/ubuntu/bin/postgres-backup.mjs restore \
  /var/lib/harness/restore/var/lib/harness/backups/harness-<timestamp>.dump \
  --confirm
```

`pg_restore --clean --if-exists` is destructive to the selected database. Stop
traffic, take a fresh pre-restore snapshot, verify the target and checksum, and
record the operator and incident reference before running it. Validate restore
procedures against a non-production database regularly.
