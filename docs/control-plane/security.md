# Control Plane Security

The sample server now has a safe baseline for local and production-shaped
operation. It is still not an identity provider or a complete RBAC system.

## Runtime policy

- loopback binding is allowed without a token for local development;
- any non-loopback binding requires `HARNESS_CONTROL_PLANE_TOKEN` at startup;
- when a token is configured, API and SSE requests require `Authorization:
  Bearer <token>`; `/health` remains suitable for a liveness probe;
- `HARNESS_CONTROL_PLANE_ORIGINS` or `security.allowedOrigins` provides the
  explicit CORS allowlist; wildcard CORS is not used;
- request bodies are JSON objects capped by `maxBodyBytes` (64 KiB by default);
- task IDs, approval actors, and approval reasons are validated before use;
- runtime execution uses a fixed Node entrypoint with `shell: false`, never a
  caller-provided command;
- every run and approval mutation writes a credential-free JSONL audit event.

## Deployment requirements

TLS termination, identity-to-actor mapping, RBAC, CSRF protection for browser
cookie deployments, secret rotation, and forwarding the audit event contract
to a durable central sink remain deployment responsibilities. The Control
Plane does not expose arbitrary shell execution, filesystem writes, or secret
retrieval endpoints.
