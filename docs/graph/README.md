# Graph Engineering

The repository uses multiple complementary graph/index layers.

| Provider | Primary role | Default |
|---|---|---|
| GitNexus | Agent-aware repository graph and impact analysis | Yes |
| SCIP | Semantic definitions/references/implementations | Optional |
| Joern | Code Property Graph, data flow, security analysis | Optional |

Do not force all providers into one physical graph database.
Normalize their outputs at the Harness context layer instead.
