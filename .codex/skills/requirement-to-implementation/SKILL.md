# Requirement to Implementation Skill

Use when a task starts from a product/user requirement rather than a code symbol.

## Flow

Requirement
→ Feature
→ Capability
→ Module
→ API / Persistence
→ Code Graph
→ Tests
→ ADR
→ Plan
→ Checkpoint
→ Implement
→ Verify
→ Handoff

## Rules

- Never jump from a vague requirement directly into implementation.
- Resolve owning feature/module first.
- If no feature exists, create a feature graph scaffold.
- If ownership is ambiguous, prefer existing repository conventions and module boundaries.
- Record assumptions in the checkpoint/handoff.
