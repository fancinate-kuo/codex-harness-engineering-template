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

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **codex-harness-engineering-template** (1219 symbols, 1708 relationships, 26 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/codex-harness-engineering-template/context` | Codebase overview, check index freshness |
| `gitnexus://repo/codex-harness-engineering-template/clusters` | All functional areas |
| `gitnexus://repo/codex-harness-engineering-template/processes` | All execution flows |
| `gitnexus://repo/codex-harness-engineering-template/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
