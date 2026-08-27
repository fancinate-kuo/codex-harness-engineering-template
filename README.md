# Codex Harness Engineering + Graph Engineering Template v2

A practical repository template for agent-first development with:

- Codex
- Harness Engineering
- Graph Engineering
- GitNexus
- SCIP
- Joern
- Structured Handoff
- Checkpoints
- Architecture Guardrails
- Playwright / Vitest / CI

Designed for a Modular Monolith + Monorepo stack such as Vue 3 + Node.js + PostgreSQL.

## Graph Strategy

This template intentionally separates three graph/index layers:

### GitNexus — primary agent graph
Use for:
- repository structure
- symbols
- calls/imports
- dependency blast radius
- process/flow awareness
- change impact
- MCP queries from Codex

### SCIP — semantic navigation index
Use for:
- definitions
- references
- implementations
- language-agnostic symbol identity
- compiler/indexer-backed semantic relationships

### Joern — deep Code Property Graph
Use for:
- AST/CFG/data-flow analysis
- taint/data-flow queries
- security analysis
- deeper program relationship queries

GitNexus is the default graph for everyday feature/bug work.
SCIP and Joern are optional specialist providers.

## First Run

```bash
pnpm install --frozen-lockfile

# Build / update GitNexus graph
pnpm graph:analyze

# Check graph freshness
pnpm graph:status

# Check the pinned CLI, index, and graph provider
pnpm graph:doctor

# Validate Harness
pnpm harness:verify
```

GitHub Actions is the canonical CI entry point. Pull requests and pushes to
`main` run the validation workflow on both Ubuntu and Windows with Node.js 22
and pnpm 10. Local development should use the same frozen-lockfile install
after enabling the repository's package manager with Corepack:

```bash
corepack enable
pnpm install --frozen-lockfile
```

## GitNexus MCP

Configure MCP once on a developer workstation (local editor configuration):

```bash
pnpm graph:setup
```

Then index the repository:

```bash
pnpm graph:analyze
```

For deterministic CLI queries, use:

```bash
pnpm graph:query context <symbol>
pnpm graph:query impact <symbol>
pnpm graph:query query "<concept>"
pnpm graph:query changes [base]
pnpm graph:query cypher "<cypher query>"
```

Codex agents should use GitNexus MCP for:
- context
- impact
- detect_changes
- query
- cypher

See `docs/graph/gitnexus.md`.

MCP credentials and personal editor configuration remain local and are never
committed to this repository.

## Standard Agent Flow

Requirement
→ Repo Map
→ GitNexus Context
→ Impact Analysis
→ Architecture Rules
→ Plan
→ Checkpoint
→ Implement
→ Tests
→ Graph Freshness
→ Harness Gate
→ Structured Handoff
→ PR

## Feature / Business Graph

Query a feature end-to-end:

```bash
pnpm graph:business feature forum.reply.edit
```

Query from a product requirement:

```bash
pnpm graph:business requirement REQ-FORUM-001
```

Validate graph integrity:

```bash
pnpm graph:business:validate
```


## Multi-Agent Orchestration

Create and initialize a task:

```bash
pnpm harness:task:create TASK-FORUM-002 "Pin forum post"
pnpm harness:run:init TASK-FORUM-002
```

Create an isolated worktree for mutable agent work:

```bash
pnpm harness:worktree:create TASK-FORUM-002
```

Inspect resume context:

```bash
pnpm harness:resume TASK-FORUM-002
```

The default v4 agent pipeline is:

Planner
→ Impact
→ Implementation
→ Test
→ Review
→ Fix (conditional)
→ PR


## Executable Orchestrator Runner

v5 adds a runnable DAG coordinator.

```bash
pnpm harness:task:create TASK-001 "Example feature"
pnpm harness:run:init TASK-001
pnpm harness:run TASK-001
```

The runner selects the next stage and writes an agent request under:

`.codex/orchestration/requests/`

After the external agent writes `<stage>.result.json` and its expected artifacts,
run the same command again:

```bash
pnpm harness:run TASK-001
```

Useful commands:

```bash
pnpm harness:status TASK-001
pnpm harness:requests
pnpm harness:resume TASK-001
```


## Codex-native Adapter (deferred)

The Codex App Server adapter is retained for a later phase. P1 does not start
live Codex turns, approvals, streaming, or automatic merges.

Check local Codex:

```bash
pnpm codex:check
```

Generate a version-matched App Server schema:

```bash
pnpm codex:schema
```

Run the next workflow stage using Codex:

```bash
pnpm harness:run:codex TASK-001
```

The compatibility command remains available, but live execution is not part of
the P1 completion gate.

## Parallel DAG Scheduler

```bash
pnpm harness:parallel:init TASK-001
pnpm harness:parallel:run TASK-001
pnpm harness:parallel:status TASK-001
pnpm harness:parallel:complete TASK-001 backend result.json
pnpm harness:parallel:retry TASK-001 backend
pnpm harness:parallel:dot
```

P1 scheduler limits come only from `.codex/orchestration/agent-pool.json`:
global 4, mutable 2, and read-only 4. Mutable nodes always receive an isolated
worktree. Invocation requests and stage results are checked for identity,
artifacts, evidence, retry policy, locks, and idempotency.

```bash
pnpm harness:orchestration:validate
pnpm harness:orchestration:smoke
```

## Dynamic DAG Compiler

Compile a task-specific workflow from current requirement/impact evidence:

```bash
pnpm harness:dag:input TASK-001
pnpm harness:dag:compile TASK-001
pnpm harness:dag:validate TASK-001
pnpm harness:dag:init TASK-001
pnpm harness:dag:run TASK-001
```

Print the compiled graph:

```bash
pnpm harness:dag:print TASK-001
```

## Runtime Feedback Loop

Record runtime evidence:

```bash
pnpm harness:feedback:record TASK-001 architecture failed "domain imported infrastructure"
```

Classify and inspect:

```bash
pnpm harness:feedback:classify TASK-001
pnpm harness:feedback:plan TASK-001
```

Apply self-correction:

```bash
pnpm harness:feedback:loop TASK-001
pnpm harness:dag:validate TASK-001
pnpm harness:dag:run TASK-001
```

## Observability + Audit Trail

Record metrics:

```bash
pnpm harness:metric TASK-001 retry_count 1
```

Record an auditable decision:

```bash
pnpm harness:audit TASK-001 review-agent replan "architecture violation"
```

Capture DAG state and generate a summary/report:

```bash
pnpm harness:observe:dag TASK-001
pnpm harness:summary TASK-001
pnpm harness:report TASK-001
```

## Governance + Approval Matrix

Evaluate risk and policy:

```bash
pnpm harness:protected-paths TASK-001
pnpm harness:risk TASK-001
pnpm harness:policy TASK-001
```

Request and decide approval:

```bash
pnpm harness:approval:request TASK-001
pnpm harness:approval:decide TASK-001 approved human "reviewed sensitive changes"
```

Check approval gate:

```bash
pnpm harness:approval:gate TASK-001
```

## Repository Memory Layer

Create a memory scaffold:

```bash
pnpm harness:memory:add decision forum-events "Use domain events across modules"
```

Search memory:

```bash
pnpm harness:memory:query "forum events"
```

Build task-specific memory context:

```bash
pnpm harness:memory:context TASK-001
```

Validate memory integrity:

```bash
pnpm harness:memory:validate
```

Promote handoff knowledge carefully:

```bash
pnpm harness:memory:from-handoff TASK-001
```

## Evaluation / Benchmark Harness

List benchmarks:

```bash
pnpm harness:eval:list
```

Prepare and compile one:

```bash
pnpm harness:eval:prepare BENCH-001
pnpm harness:dag:compile EVAL-BENCH-001
pnpm harness:dag:validate EVAL-BENCH-001
```

Score and aggregate:

```bash
pnpm harness:eval:score EVAL-BENCH-001
pnpm harness:eval:aggregate
```

## Production Control Plane

Start the local API:

```bash
pnpm harness:control:serve
```

For a non-loopback deployment, set `HARNESS_CONTROL_PLANE_TOKEN` and an
explicit `HARNESS_CONTROL_PLANE_ORIGINS`; the server refuses to start without
the token. Local loopback development remains tokenless by default.

Generate a read-model snapshot:

```bash
pnpm harness:control:snapshot
```

Generate dashboard data:

```bash
pnpm harness:control:dashboard-data
```

Key API endpoints:
- `GET /health` (liveness)
- `GET /ready` (runtime/database readiness)
- `GET /overview`
- `GET /tasks`
- `GET /tasks/:taskId`
- `GET /tasks/:taskId/dag`
- `GET /tasks/:taskId/approvals`
- `POST /tasks/:taskId/run`
- `POST /tasks/:taskId/approvals/:decision`
- `GET /evaluation/summary`

## Vue 3 Live Control Plane Dashboard

Start the Control Plane API:

```bash
pnpm harness:control:serve
```

Start the Vue dashboard:

```bash
pnpm control:dev
```

Open:

```text
http://127.0.0.1:4318
```

The dashboard uses SSE from `/events` for live updates and includes:
- Overview metrics
- Task queue
- Task detail
- DAG status
- Approvals
- Runtime feedback
- Observability
- Evaluation health

## Interactive DAG + Execution Console

v16 adds:
- SVG DAG graph
- pan / zoom
- node selection
- dependency edges
- live execution console
- token/cost telemetry fields

Record token/cost data:

```bash
pnpm harness:token-cost TASK-001 backend 1200 450 0.012
```

Run API + dashboard as before:

```bash
pnpm harness:control:serve
pnpm control:dev
```

## PostgreSQL Persistence + Event Store

Set the database connection:

```bash
export HARNESS_DATABASE_URL=postgres://postgres:postgres@localhost:5432/harness
export HARNESS_RUNTIME_STORE=postgres
```

Initialize:

```bash
pnpm harness:runtime:check
pnpm db:migrate
pnpm db:check
pnpm db:seed
```

Persist one task snapshot:

```bash
pnpm harness:persist:snapshot TASK-001
```

Read append-only events:

```bash
pnpm harness:events TASK-001
```

The Control Plane selects the PostgreSQL runtime adapter when configured;
without a database URL it stays in the filesystem fallback. Repository
configuration remains versioned in Git in either mode.

Production readiness, release sequencing, health probes, edge responsibilities,
backup, and rollback guidance are documented in
`docs/control-plane/production-readiness.md`.
