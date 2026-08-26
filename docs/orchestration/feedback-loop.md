# Runtime Feedback Loop

v9 turns Harness execution into a closed-loop system.

## Loop

Execute DAG
→ collect runtime evidence
→ classify failure
→ compare actual impact with predicted impact
→ decide retry vs replan
→ patch/extend DAG
→ execute new nodes
→ verify again

## Feedback Sources

- unit/integration test results
- Playwright results/traces
- CI results
- architecture checks
- GitNexus detect_changes
- review findings
- security findings
- migration/runtime errors

## Principle

Retry is for transient failures.
Replanning is for new evidence.
