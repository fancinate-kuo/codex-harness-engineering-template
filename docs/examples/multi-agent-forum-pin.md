# Multi-Agent Example: Forum Post Pinning

Task:
`TASK-FORUM-002`

Requirement:
Moderators can pin a forum post.

## Planner
Produces:
`plan.json`

## Impact
Queries:
- Business Graph: `forum.post.pin`
- GitNexus context
- GitNexus impact

Produces:
`impact.json`

## Implementation
Creates dedicated worktree:
`.codex/worktrees/TASK-FORUM-002`

Implements minimal backend/frontend changes.

## Test
Runs:
- unit
- integration
- Playwright
- architecture tests

Produces:
`test-report.json`

## Review
Checks:
- correctness
- authorization
- module boundaries
- scope creep
- graph freshness

Produces:
`review-report.json`

## Fix
Runs only if actionable failures exist.

## PR
Requires Harness Gate and final handoff.
