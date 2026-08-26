# Runner Demo

```bash
pnpm harness:task:create TASK-DEMO-001 "Demo task"
pnpm harness:run:init TASK-DEMO-001
pnpm harness:run TASK-DEMO-001
```

Expected:

- runner selects Planner
- request is written to:
  `.codex/orchestration/requests/TASK-DEMO-001__planner.json`

After the Planner agent writes:

`.codex/orchestration/shared/TASK-DEMO-001/plan.json`

rerun:

```bash
pnpm harness:run TASK-DEMO-001
```

The runner advances to Impact.

This pattern continues until completion.
