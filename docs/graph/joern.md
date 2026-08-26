# Joern Integration

Joern builds a Code Property Graph (CPG).

Use Joern for:
- AST relationships
- control-flow graph analysis
- data-flow analysis
- taint analysis
- vulnerability/security queries
- deeper program analysis

## Typical Flow

Import code into Joern, then query through the Joern CPG query language.

Example concepts:

- `cpg.method`
- `cpg.call`
- `cpg.file`
- data-flow traversals

## Harness Role

Joern is not required for ordinary feature work.
Invoke it when the task requires deep static analysis or security reasoning.
