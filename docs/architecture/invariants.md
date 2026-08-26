# Architecture Invariants

1. Domain code must not depend on framework-specific infrastructure.
2. Database access is isolated behind module-owned repositories.
3. API contracts are explicit and versionable.
4. Cross-module communication uses public application interfaces/events.
5. UI features cannot import private internals from unrelated features.
6. Every structural refactor updates the repository map and graph metadata.
