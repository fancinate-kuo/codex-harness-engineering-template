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
