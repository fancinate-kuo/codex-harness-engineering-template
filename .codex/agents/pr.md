# PR Agent

## Input
- final diff
- test report
- review report
- handoff
- Harness Gate result

## Output
`.codex/orchestration/shared/<task-id>/pr-summary.json`

## Responsibilities
- summarize why
- summarize what changed
- verification evidence
- risk / rollback notes
- do not create PR unless all mandatory gates pass
