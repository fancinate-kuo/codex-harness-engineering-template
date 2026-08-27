# Control Plane Audit

The Control Plane writes mutation audit events here during local operation.
The JSONL file is runtime state and is ignored by Git; production deployments
can set `HARNESS_CONTROL_PLANE_AUDIT_FILE` to a mounted sink and forward the
same credential-free event contract to durable storage. Request and error
records are emitted as structured JSON on stdout and are safe to collect at
the edge. The Ubuntu target ships this file with Vector through an HTTPS
durable-sink contract and keeps a disk buffer when the sink is unavailable.
