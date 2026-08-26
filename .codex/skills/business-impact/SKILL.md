# Business Impact Skill

## Purpose
Trace a requirement or feature to business and technical implementation scope.

## Procedure

1. Identify the Requirement or Feature ID.
2. Query the Business Graph.
3. Identify:
   - business capability
   - owning module
   - public APIs
   - persistence tables
   - tests
   - ADRs
   - owners
   - risk
4. Query GitNexus for code-level context and symbol blast radius.
5. Merge Business Graph scope with Code Graph scope.
6. Record predicted impact in checkpoint.
7. Implement the smallest valid change.
8. After implementation, run GitNexus `detect_changes`.
9. Compare actual diff scope to predicted business/code impact.
10. Update Business Graph if feature ownership or architecture changed.
