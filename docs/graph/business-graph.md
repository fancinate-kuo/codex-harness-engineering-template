# Feature / Business Graph

The Business Graph connects product intent to implementation.

## Core Path

Requirement
→ Feature
→ Business Capability
→ Module
→ API
→ Symbol
→ Database Table
→ Test
→ ADR

This graph is an overlay on top of the code graph.

## Why

A code graph answers:
- what calls this symbol?
- what imports this file?
- what may break if this changes?

A business graph answers:
- which feature owns this code?
- which business capability is affected?
- which tests prove this behavior?
- which ADR constrains the implementation?
- which API/table belongs to this requirement?

Both are needed for reliable agentic development.

## Recommended Node Types

- Requirement
- Feature
- BusinessCapability
- Module
- API
- Symbol
- DatabaseTable
- Test
- ADR
- Owner
- Risk

## Recommended Edges

- REQUIREMENT_REQUESTS_FEATURE
- FEATURE_SUPPORTS_CAPABILITY
- FEATURE_OWNED_BY_MODULE
- FEATURE_EXPOSED_BY_API
- API_IMPLEMENTED_BY_SYMBOL
- MODULE_OWNS_TABLE
- TEST_VERIFIES_FEATURE
- ADR_GOVERNS_FEATURE
- OWNER_OWNS_MODULE
- FEATURE_HAS_RISK
