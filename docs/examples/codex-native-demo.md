# Codex Native Demo

Prerequisites:

```bash
codex --version
pnpm codex:check
pnpm codex:schema
```

Create a task:

```bash
pnpm harness:task:create TASK-CODEX-001 "Add forum reply edit"
pnpm harness:run:init TASK-CODEX-001
```

Start the next stage directly with Codex:

```bash
pnpm harness:run:codex TASK-CODEX-001
```

The Harness will:
- select the next stage
- create a worktree if needed
- start or resume a Codex thread
- issue a turn with stage-specific instructions
- persist the thread ID

Run again after the expected artifact is produced to advance to the next stage.
