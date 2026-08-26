# Agent Permission Boundaries

Agents should have the minimum mutation rights required for their role.

Examples:
- Planner: read-only except planning artifacts
- Impact: read-only except impact artifacts
- Implementation: code + tests in assigned worktree
- Test: tests + reports
- Review: reports only
- PR: summaries/metadata only

Production enforcement may use sandbox rules, filesystem policies, or isolated execution environments.
