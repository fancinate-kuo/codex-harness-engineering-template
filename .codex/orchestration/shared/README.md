# Shared Workspace

Agents exchange machine-readable context here.

Recommended artifacts:
- requirement.json
- plan.json
- impact.json
- implementation-summary.json
- test-report.json
- review-report.json
- fix-report.json
- pr-summary.json

Prefer immutable stage outputs.
A later agent should append a new artifact instead of rewriting prior evidence.
