# Locks

Optional coordination locks.

Suggested lock names:
- task-<id>.lock
- worktree-<id>.lock
- graph-refresh.lock
- release.lock

The sample orchestrator uses file locks only as a lightweight local convention.
Distributed execution should use a real coordination service.
