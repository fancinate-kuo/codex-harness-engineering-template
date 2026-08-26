# Security Analysis Skill

## Provider Selection

Use GitNexus first for architecture and call-path context.

Use Joern when the task requires:
- source-to-sink reasoning
- taint/data-flow
- control-flow aware analysis
- vulnerability-oriented CPG queries

Use SCIP only when precise semantic symbol/reference resolution helps scope the analysis.

Always separate:
- confirmed evidence
- plausible paths
- unverified hypotheses
