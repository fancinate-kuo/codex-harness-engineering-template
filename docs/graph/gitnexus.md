# GitNexus Integration

GitNexus is the repository's primary agent graph. P1 uses the pinned `1.6.9`
CLI through the project package manager so local and CI invocations resolve the
same toolchain:

```text
pnpm exec gitnexus
```

The package dependency and root scripts provide this contract:

```text
gitnexus: 1.6.9 (development dependency)
graph:analyze  -> node scripts/graph/analyze.mjs
graph:build    -> node scripts/graph/build.mjs
graph:status   -> node scripts/graph/status.mjs
graph:doctor   -> node scripts/graph/doctor.mjs
graph:query    -> node scripts/graph/query.mjs
```

## CLI workflow

Build or refresh the index without changing `AGENTS.md`, `CLAUDE.md`, or local
skill files:

```bash
pnpm graph:analyze
pnpm graph:status
pnpm graph:doctor
```

`graph:analyze` invokes `gitnexus analyze --index-only`. `graph:status` exits
non-zero when the index is missing, stale, unavailable, or the provider process
fails. `graph:doctor` additionally checks the pinned CLI version and graph
store. Optional full-text search degradation is reported as a warning and does
not fail the provider gate.

Stable query routing is available through one entrypoint:

```bash
pnpm graph:query context <symbol>
pnpm graph:query impact <symbol>
pnpm graph:query query "<concept>"
pnpm graph:query changes                 # current unstaged changes
pnpm graph:query changes main            # compare against a base ref
pnpm graph:query cypher "<cypher query>"
```

Unknown query types, missing targets, and invalid base-ref arguments exit with
code `2`. GitNexus process failures retain their original non-zero exit code.
The query wrapper emits the GitNexus result directly; it does not silently
convert a failed or empty graph query into an empty impact result.

## MCP workflow

MCP is the agent-facing interface, while the CLI is the setup, index, health,
and deterministic script interface. Use GitNexus MCP for:

- `context` before editing an important symbol;
- `impact` before changing a shared or high-fanout symbol;
- `query` when starting from a business or process concept;
- `detect_changes` before handoff or commit review;
- `cypher` only for graph questions not covered by the higher-level tools.

One-time MCP setup is local to each developer workstation:

```bash
pnpm exec gitnexus setup
```

The setup command may edit the local Codex/editor configuration. Do not commit
that configuration, credentials, tokens, or generated MCP state to this repo.
The repository only documents the interface; it does not claim that P1 starts
a live Codex App Server turn.

## Provider policy

GitNexus remains the default provider in `graph/providers.json`. SCIP and Joern
remain optional specialist providers and are not part of the P1 health gate.
The `.gitnexus/` index is runtime state and remains ignored. Refresh it after
commits or merges before running the final harness verification.
