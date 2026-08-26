# Governance and Policy Engine

v11 adds explicit governance to the Harness.

The goal is to answer:

- Which tasks may run fully autonomously?
- Which actions require human approval?
- Which changes are always blocked?
- Which risk classes require stricter verification?
- Which agents are allowed to mutate which areas?
- Which decisions must be auditable?

## Governance Layers

1. Task policy
2. Agent permission policy
3. Change-risk policy
4. Approval matrix
5. Protected-path policy
6. Release/PR gate policy
