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
CI may skip graph indexing if the provider is expensive or unavailable.
In that case, graph freshness should be verified in a dedicated job or developer/agent gate.
Architecture tests remain mandatory in CI.
