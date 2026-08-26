# Control Plane Audit

The Control Plane writes mutation audit events here during local operation.
The JSONL file is runtime state and is ignored by Git; production deployments
should forward the same event contract to the PostgreSQL event store or a
central audit sink.
