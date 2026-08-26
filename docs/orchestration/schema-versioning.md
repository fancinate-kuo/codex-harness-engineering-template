# App Server Schema Versioning

Do not freeze protocol structures copied from documentation.

Instead:

```bash
pnpm codex:schema
```

Generate JSON Schema from the installed Codex binary.

This lets CI/developer environments validate against the protocol version
they actually execute.
