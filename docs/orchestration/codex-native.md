# Codex-native Execution

v6 adds a native Codex execution adapter based on `codex app-server`.

## Why App Server

`codex app-server` exposes the Codex harness through a client-friendly,
bidirectional JSON-RPC interface.

The Harness runner can therefore manage:
- Codex threads
- turns
- streamed events
- working directory
- long-lived task context
- resume
- approvals
- structured stage execution

## Protocol Lifecycle

1. launch `codex app-server`
2. send `initialize`
3. receive initialize response
4. send `initialized`
5. `thread/start` or `thread/resume`
6. send `turn/start`
7. stream notifications
8. wait for turn completion
9. persist thread ID
10. validate expected output artifacts

## Version-safe Schema

Generate the schema from the locally installed Codex:

```bash
pnpm codex:schema
```

This runs:

```bash
codex app-server generate-json-schema
```

The generated schema matches the installed Codex version.
