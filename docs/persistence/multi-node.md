# Multi-node Operation

PostgreSQL enables:
- multiple Control Plane instances
- multiple schedulers
- remote agents
- shared approval state
- shared audit history
- long-running task recovery

The runtime coordination migration provides task leases and idempotency keys;
the scheduler can use these as the shared coordination seam. A deployment
should still add leader election when it runs more than one scheduler and
size the pool appropriately (PgBouncer may be useful at larger scale).
