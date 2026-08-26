# Governance Example

Task:
Change authorization model and add a database migration.

Risk evaluation:
- authBoundaryChange = true
- databaseChange = true
- risk = high

Policy decision:
`approval-required`

Allowed before approval:
- Planner
- Impact
- DAG compilation
- read-only analysis

Blocked before approval:
- sensitive mutation
- final PR progression

After approval:
Harness resumes execution and records the decision in the audit trail.
