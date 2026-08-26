# Evaluation Flow

```bash
pnpm harness:eval:list
pnpm harness:eval:prepare BENCH-001
pnpm harness:dag:compile EVAL-BENCH-001
pnpm harness:dag:validate EVAL-BENCH-001
pnpm harness:eval:score EVAL-BENCH-001
pnpm harness:eval:aggregate
```

Use real execution evidence when available.
For fast policy regression tests, compiled DAG structure alone can be scored.
