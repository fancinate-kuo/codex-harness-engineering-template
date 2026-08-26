# Executable Orchestrator Runner

v5 introduces a runnable local orchestration engine.

## Main Entry

```bash
pnpm harness:run TASK-FORUM-002
```

The runner:

1. loads task state,
2. loads workflow DAG,
3. determines the next runnable stage,
4. validates required artifacts/gates,
5. creates a worktree when the stage is mutable,
6. writes an agent invocation request,
7. waits for stage output to exist,
8. validates stage result,
9. transitions state,
10. retries retryable failures,
11. resumes from persisted state after interruption.

## Important

This runner coordinates agent work; it does not assume a specific remote agent API.

The default adapter is `file-request`:
- the runner writes an invocation JSON file,
- an external Codex/agent process consumes it,
- the agent writes the expected stage artifact,
- the runner validates and proceeds.

This keeps the Harness portable.
