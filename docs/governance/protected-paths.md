# Protected Paths

Protected paths are not necessarily forbidden.

They trigger elevated scrutiny because changes may affect:
- deployment
- contracts
- migrations
- architecture decisions
- CI/CD

Examples:
- migrations/
- infra/
- packages/contracts/
- docs/adr/
- pipeline definitions

Protected-path detection should feed risk evaluation and approval policy.
