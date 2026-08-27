# Domain Docs

How the engineering skills should consume this repo's domain documentation.

## Before exploring, read these

- **`CONTEXT-MAP.md`** at the repo root: it points at the `CONTEXT.md` file for each relevant context.
- **`docs/adr/`**: read system-wide ADRs that touch the area you're about to work in.
- Context-specific **`docs/adr/`** directories: read decisions scoped to the context you're changing.

Read every context document and ADR relevant to the topic. If any of these files don't exist, proceed silently. Don't flag their absence or suggest creating them upfront; domain documentation is created lazily when terms or decisions are actually resolved.

## File structure

This repository uses a multi-context layout:

```
/
├── CONTEXT-MAP.md                  ← map of the repository's contexts
├── docs/adr/                       ← system-wide decisions
├── apps/                           ← application contexts
└── packages/                       ← package contexts
    └── <context>/
        ├── CONTEXT.md
        └── docs/adr/               ← context-specific decisions
```

## Use the glossary's vocabulary

When your output names a domain concept—in an issue title, refactor proposal, hypothesis, or test name—use the term as defined in the relevant `CONTEXT.md`. If the concept isn't in the glossary yet, reconsider the wording or record the gap for domain modeling.

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding it:

> _Contradicts ADR-0007 (event-sourced orders), but worth reopening because…_
