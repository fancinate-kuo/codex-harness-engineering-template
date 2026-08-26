# Regression Policy

A Harness change should not be promoted when:
- benchmark pass rate drops materially
- critical benchmark fails
- retry/replan rate rises unexpectedly
- PR gate failure rate increases
- security/governance expectations are bypassed

Benchmarks should grow from real failure cases over time.
