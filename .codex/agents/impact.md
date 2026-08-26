# Impact Agent

## Input
- plan.json
- business graph
- GitNexus context/impact
- optional SCIP/Joern specialist queries

## Output
`.codex/orchestration/shared/<task-id>/impact.json`

## Responsibilities
- First run GitNexus MCP `context` for the affected symbol or feature.
- Run GitNexus MCP `impact` before assessing shared or high-fanout changes.
- business blast radius
- code blast radius
- API/table/test/ADR impact
- risk classification
- unexpected coupling detection
- write query evidence and graph provenance to the machine-readable impact artifact
- if GitNexus fails, record a blocker with the provider error; never treat failure as an empty impact
- do not modify production code
