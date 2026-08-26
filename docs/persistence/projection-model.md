# Projection Model

Operational tables are projections of runtime events.

Recommended direction:

Event Store
→ Projection Worker
→ tasks / node_runs / approvals / metrics / audit / memory

The v17 template uses write-through persistence for simplicity.
A later version can switch to asynchronous projection workers without changing the event model.
