# Failure Classification

## transient
Examples: flaky test, temporary network issue, timeout.
Action: retry same node.

## test-regression
A deterministic behavior regression.
Action: add Fix node and rerun verification.

## ui-regression
Playwright or UI contract regression.
Action: Fix + Playwright verification.

## architecture-violation
Boundary/dependency rule failure.
Action: Fix + review.

## unexpected-impact
Actual GitNexus detect_changes scope exceeds predicted impact.
Action: impact refresh + fix/review.

## security-finding
Validated security issue.
Action: security fix + security review.

## migration-failure
Schema/data migration failure.
Action: migration fix + test.
