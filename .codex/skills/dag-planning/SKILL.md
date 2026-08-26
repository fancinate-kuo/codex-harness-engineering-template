# Dynamic DAG Planning Skill

## Goal
Compile the smallest safe execution graph for the current requirement.

## Inputs
- requirement
- feature/business graph
- code impact
- risk
- architecture constraints

## Rules
- Do not add frontend work if no UI behavior changes.
- Do not add database work if persistence/schema is unaffected.
- Add Playwright for user-visible UI behavior.
- Add security review for auth, secrets, permissions, payment, or sensitive trust-boundary changes.
- Add integration when multiple mutable branches must be joined.
- Keep review and PR gates.
- Prefer fewer nodes when the same verification can safely cover the task.
