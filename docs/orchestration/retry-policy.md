# Retry Policy

## Retryable
- flaky test
- temporary tool failure
- transient CI/network issue
- formatting/lint autofix

## Not Automatically Retryable
- architecture violation
- ambiguous requirement
- broad unexpected blast radius
- destructive schema change
- repeated identical failure

## Default
Maximum automatic retries per stage: 2.

After 2 failed retries:
- mark task `blocked`
- record failure evidence
- require planner/reviewer re-evaluation
