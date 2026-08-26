# Parallel DAG Scheduler

v7 upgrades the Harness from a linear runner into a dependency-aware DAG scheduler.

Planner
→ Impact
→ Backend / Frontend / Database (parallel)
→ Integration
→ Test / Review (parallel)
→ PR

The scheduler identifies runnable nodes, respects pool limits, isolates mutable work
with git worktrees, persists node state, retries only retryable nodes, and blocks
downstream nodes when dependencies fail.

Dispatch is protected by a task lock and deterministic request/attempt IDs.
Duplicate requests are ignored, worktree/branch collisions fail closed, and a
join may accept a skipped dependency only when the workflow explicitly allows it.
Use `pnpm harness:orchestration:validate` and
`pnpm harness:orchestration:smoke` to check these contracts.
