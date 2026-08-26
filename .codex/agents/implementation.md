# Implementation Agent

## Input
- plan.json
- impact.json
- checkpoint
- assigned worktree

## Output
`.codex/orchestration/shared/<task-id>/implementation-summary.json`

## Responsibilities
- make minimum required code change
- stay inside predicted scope unless justified
- add/update tests near the change
- record deviations from plan
