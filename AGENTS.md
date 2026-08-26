# AGENTS.md

## Mission
Work as an engineering agent inside a Harness Engineering repository.

## Required Startup Sequence

Before modifying code:

1. Read this file.
2. Read `docs/architecture/overview.md`.
3. Read `docs/architecture/dependency-rules.md`.
4. Read `.codex/context/repo-map.json`.
5. Check GitNexus graph freshness with `pnpm graph:status`.
6. Use GitNexus MCP `context` or `query` for the affected feature/symbol.
7. Use GitNexus MCP `impact` before changing shared/high-fanout symbols.
8. Read related ADRs and feature docs.
9. Create an implementation plan.
10. Create a checkpoint.

## Graph Policy

### Default
GitNexus is the primary graph provider for normal development.

Use:
- `context` for a symbol's 360-degree view.
- `impact` for blast-radius analysis.
- `detect_changes` for current git diff impact.
- `query` for feature/process discovery.
- `cypher` only when higher-level tools are insufficient.

### SCIP
Use SCIP when compiler/indexer-backed definition/reference information is needed.

### Joern
Use Joern for deep CPG, control/data-flow, taint, or security analysis.

## Engineering Rules

- Prefer the smallest correct change.
- Follow YAGNI, KISS, and existing project conventions.
- Do not bypass module boundaries.
- Do not access another module's private persistence layer.
- Do not add abstractions without a concrete current use.
- Update tests with behavior changes.
- UI behavior changes require Playwright coverage where applicable.
- Structural changes require graph/context refresh.
- Do not mark work complete with pending mandatory verification.

## Before Completion

1. Run affected tests.
2. Run `pnpm graph:status`.
3. Re-index when stale: `pnpm graph:analyze`.
4. For non-trivial diffs, use GitNexus MCP `detect_changes`.
5. Run `pnpm harness:verify`.
6. Write a structured handoff.

## Completion Gate

`pnpm harness:verify` must pass.
