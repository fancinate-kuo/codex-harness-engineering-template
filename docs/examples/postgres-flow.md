# PostgreSQL Flow

```bash
export HARNESS_DATABASE_URL=postgres://postgres:postgres@localhost:5432/harness

pnpm db:check
pnpm db:migrate
pnpm db:seed

pnpm harness:persist:snapshot TASK-001
pnpm harness:events TASK-001
```

Runtime state becomes durable across Control Plane restarts.
