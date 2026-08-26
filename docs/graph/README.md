# Graph Engineering

The repository uses multiple complementary graph/index layers.

| Provider | Primary role | Default |
|---|---|---|
| GitNexus | Agent-aware repository graph and impact analysis | Yes |
| SCIP | Semantic definitions/references/implementations | Optional |
| Joern | Code Property Graph, data flow, security analysis | Optional |

GitNexus is invoked through the pinned project command `pnpm exec gitnexus`.
Use `pnpm graph:analyze` for index-only analysis, `pnpm graph:doctor` for the
provider health gate, and `pnpm graph:query` for the stable CLI query contract.

Do not force all providers into one physical graph database.
Normalize their outputs at the Harness context layer instead.
