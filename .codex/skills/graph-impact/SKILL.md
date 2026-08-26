# Graph Impact Skill

## When to Use
Use before changing:
- shared services
- public contracts
- high-fanout utilities
- module boundaries
- persistence schemas
- cross-feature components

## Procedure

1. Ensure GitNexus index is current.
2. Use GitNexus `context` for the target symbol.
3. Use GitNexus `impact`.
4. Identify direct and indirect affected modules.
5. Map affected modules to tests using repo-map and graph metadata.
6. Record risk in the checkpoint.
7. After implementation, use GitNexus `detect_changes`.
8. Compare actual changed scope to predicted impact.
9. Escalate unexpected scope expansion before completion.
