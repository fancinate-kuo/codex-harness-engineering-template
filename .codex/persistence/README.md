# Persistence Configuration

Set:

```bash
HARNESS_DATABASE_URL=postgres://user:password@localhost:5432/harness
```

Then:

```bash
pnpm db:check
pnpm db:migrate
pnpm db:seed
```

If PostgreSQL is unavailable, the template can still use filesystem state for local development.
