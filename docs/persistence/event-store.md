# Event Store

The event store records append-only operational events.

Examples:
- task.created
- dag.compiled
- node.started
- node.completed
- node.failed
- approval.requested
- approval.approved
- feedback.recorded
- dag.replanned
- harness.verify.passed
- pr.ready

Current-state tables are projections.
The event log is the immutable history used for audit and reconstruction.
