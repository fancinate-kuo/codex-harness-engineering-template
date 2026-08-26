# Multi-Agent Orchestration Harness

This layer coordinates specialized agents on top of the Harness + Graph layers.

## Default Pipeline

Planner Agent
→ Impact Agent
→ Implementation Agent
→ Test Agent
→ Review Agent
→ Fix Agent (conditional)
→ PR Agent

## Design Goals

- isolate mutable work with git worktrees
- preserve context through structured artifacts
- avoid duplicated scanning
- make every handoff machine-readable
- allow resume after interruption
- keep agent responsibilities narrow
- enforce verification before progression

## Shared State

All orchestration state lives under:

`.codex/orchestration/`

Key areas:
- queue
- runs
- shared
- locks
- policies

P1 limits come only from `agent-pool.json`: global 4, mutable 2, and read-only
4. Mutable nodes use isolated worktrees. The file-request adapter is canonical
for P1; live Codex App Server turns, approvals, streaming, and automatic merge
remain deferred.

Every invocation has a request/attempt identity. A passed stage result must
match its node and request, list every expected artifact, and include
verification evidence. Failed or blocked results require a failure summary.
