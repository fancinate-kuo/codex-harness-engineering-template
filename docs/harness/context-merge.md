# Context Merge Model

Harness Engineering should merge context from multiple sources instead of treating one graph as authoritative.

## Input Layers

### Business Context
- requirement
- feature
- capability
- module
- API
- table
- tests
- ADR
- owner

### Code Context
- file
- symbol
- call
- import
- reference
- process
- dependency

### Runtime / Validation Context
- failing tests
- Playwright traces
- CI output
- lint/typecheck
- git diff

## Unified Agent Context

The agent should reason over:

Business Intent
+ Architecture Constraints
+ Code Relationships
+ Current Diff
+ Verification Evidence

This is the practical meaning of a unified Native Graph + Overlay query model.
