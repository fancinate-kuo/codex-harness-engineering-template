# GitNexus Integration

## Install / Analyze

```bash
npx gitnexus analyze
```

For one-time editor/MCP setup:

```bash
npx gitnexus setup
```

## Recommended MCP Usage

Codex should prefer the following GitNexus MCP tools:

### context
Use before editing an important symbol.

Purpose:
- callers
- callees
- references
- related processes
- surrounding architecture

### impact
Use before modifying a shared symbol.

Purpose:
- blast radius
- depth-grouped dependents
- confidence/risk awareness

### detect_changes
Use after implementation and before handoff/PR.

Purpose:
- map git diff to impacted symbols/processes
- detect accidental scope expansion

### query
Use when starting from business/domain language rather than a symbol.

Examples:
- forum reply editing
- authentication flow
- settlement process

### cypher
Use only for custom graph questions not covered by higher-level tools.

## Harness Rule

A stale GitNexus index is not automatically a failure for trivial documentation-only changes.
For code changes, refresh it before final verification.
