# Feature Development Skill

## Goal
Implement the smallest complete feature while preserving architecture and verification guarantees.

## Procedure

1. Read `AGENTS.md`.
2. Identify the owning feature/module.
3. Read relevant architecture docs and ADRs.
4. Inspect `.codex/context/repo-map.json`.
5. Query graph metadata for affected code, APIs, tables, tests, and docs.
6. Write an implementation plan.
7. Create a checkpoint.
8. Implement the minimum required change.
9. Add/update unit tests.
10. Add/update integration tests.
11. Add/update Playwright tests for UI behavior changes.
12. Run architecture validation.
13. Refresh repo-map and graph if structure changed.
14. Run `pnpm harness:verify`.
15. Create a structured handoff.

## Stop Conditions
Do not mark the task complete when any required verification is pending or failing.
