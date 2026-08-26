# Repository Knowledge / Memory Layer

v12 adds durable project memory on top of code, graph, and runtime evidence.

## Purpose

Preserve knowledge that is useful across tasks:

- architecture decisions
- feature ownership decisions
- recurring failure modes
- review findings
- validated fixes
- graph-impact lessons
- migration caveats
- operational constraints
- known exceptions

## Memory Is Not Truth By Default

Every memory record must carry:
- source
- timestamp
- confidence
- scope
- status
- optional expiry

Current code, tests, ADRs, and authoritative docs remain higher priority.
