# Control Plane Persistence Integration

v17 introduces database repositories but keeps filesystem read-model compatibility.

Recommended production transition:

1. write-through to PostgreSQL
2. verify parity with filesystem state
3. switch Control Plane reads to PostgreSQL
4. keep filesystem only for portable config / bootstrap
5. move event streaming to database-backed events
