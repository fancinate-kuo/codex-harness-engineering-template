# Task State Machine

proposed
→ planning
→ impact_analysis
→ ready_for_implementation
→ implementing
→ testing
→ reviewing
→ fixing
→ ready_for_pr
→ completed

Failure states:
- blocked
- failed
- cancelled

## Transition Rule

An agent may only move a task to the next state when:
1. its required output artifact exists,
2. required validation passed,
3. handoff is written,
4. next agent requirements are satisfied.
