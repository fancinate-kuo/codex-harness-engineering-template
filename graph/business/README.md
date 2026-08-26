# Business Graph

This directory contains the product/architecture overlay used by Codex.

Primary file:
- `business-graph.json`

Validate:

```bash
pnpm graph:business:validate
```

Query:

```bash
pnpm graph:business feature forum.reply.edit
pnpm graph:business requirement REQ-FORUM-001
pnpm graph:business module forum
```

Scaffold a new feature:

```bash
pnpm graph:feature:add forum.post.pin "Pin forum post"
```
