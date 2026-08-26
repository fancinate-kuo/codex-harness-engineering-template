# Memory Example

Task A discovers that forum and notification modules must communicate through
domain events rather than direct repository access.

After review:
- decision is validated
- source points to task/ADR
- confidence = high
- scope = forum + notification

Task B later touches forum notification behavior.

Harness loads relevant memory before planning and avoids repeating the same
cross-module design mistake.
