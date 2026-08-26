# Self-Correcting Example

Initial DAG:

Planner → Impact → Backend / Frontend → Integration → Test → Review → PR

Runtime:
- Test passes
- Review detects unexpected cross-module dependency

Feedback:
`architecture-violation`

Recompiled DAG:

Planner → Impact → Backend / Frontend → Integration → Test
→ Fix → Review → PR

If GitNexus then reports unexpected blast radius:

`unexpected-impact`

The DAG can additionally add:

Impact Refresh → Fix → Review → PR
