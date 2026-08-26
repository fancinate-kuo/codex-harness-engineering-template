# Feature Lifecycle

## Proposed Statuses

- proposed
- planned
- implementing
- verifying
- released
- deprecated

## Required Graph Updates

### New Feature
Add:
- Requirement
- Feature
- Capability link
- Module ownership
- APIs/tables
- tests
- ADRs when relevant

### Refactor
Update:
- module ownership
- API bindings
- symbol mappings
- affected tests

### Deprecation
Mark feature deprecated before deleting implementation links.

The Business Graph should describe current product architecture, not historical git state.
