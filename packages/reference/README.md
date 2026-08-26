# Generic Reference Module

This is the executable reference module for the template. It demonstrates the
repository's modular-monolith seam without introducing a framework or a
database dependency:

`contracts → domain → application → infrastructure`

The public interface is `ReferenceService`. The application depends on the
small `ReferenceEntryRepository` port, and the in-memory adapter makes the
module runnable in unit tests and local examples. A future API or PostgreSQL
adapter can depend on the same public contract without moving persistence into
the domain.

```ts
const service = new ReferenceService(new InMemoryReferenceEntryRepository())
await service.create({ title: 'Example', body: 'A useful reference.' })
```

The module owns its validation, lifecycle (`active` / `archived`), and JSON
snapshot contract. It intentionally does not claim to be a production API.
