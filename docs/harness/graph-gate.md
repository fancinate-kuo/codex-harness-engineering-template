# Graph Gate

Graph checks are part of Harness completion.

## Before Implementation
- graph exists
- graph is not stale
- impact is understood for non-trivial shared changes

## After Implementation
- graph refreshed if code structure changed
- current diff analyzed with `detect_changes`
- unexpected impacted processes reviewed

## CI
CI runs `pnpm graph:analyze` followed by `pnpm graph:doctor`; a missing, stale,
or unavailable provider fails the workflow. `HARNESS_SKIP_GRAPH=1` is only a
local bootstrap escape hatch and is rejected when `CI=true`.
Architecture tests and orchestration contracts remain mandatory in CI.
