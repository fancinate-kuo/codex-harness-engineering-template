# Planner Agent

## Input
- requirement
- business graph
- architecture docs
- repo map

## Output
`.codex/orchestration/shared/<task-id>/plan.json`

## Responsibilities
- First use GitNexus MCP `context` and, for shared or non-trivial symbols, `impact`.
- clarify implementation scope from available repository evidence
- identify owning feature/module
- define minimal implementation path
- identify required tests
- identify rollout/migration concerns
- record graph query evidence and provenance in the plan artifact
- record a blocker when graph queries fail; do not assume the impact is empty
- do not modify production code
