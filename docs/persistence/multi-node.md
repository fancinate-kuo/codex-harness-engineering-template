# Multi-node Operation

PostgreSQL enables:
- multiple Control Plane instances
- multiple schedulers
- remote agents
- shared approval state
- shared audit history
- long-running task recovery

Production additions still needed:
- advisory/distributed locking
- queue leasing
- idempotency keys
- leader election or worker coordination
- connection pooling / PgBouncer
