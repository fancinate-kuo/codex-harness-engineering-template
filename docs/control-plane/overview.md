# Production Control Plane

v14 turns the Harness into an operable platform.

## Responsibilities

The Control Plane exposes a unified view over:

- tasks
- compiled DAGs
- node state
- agent pool
- approvals
- governance decisions
- feedback/replans
- observability
- benchmark/evaluation results
- repository memory
- graph freshness

## Separation

Control Plane:
- observes
- coordinates
- authorizes
- dispatches
- reports

Execution Plane:
- Codex
- worktrees
- tests
- graph tools
- CI
- implementation agents

The Control Plane should not directly edit application code.
