# Join Strategy

The Integration Agent is the join point.

It inspects branch summaries, reconciles contracts, merges deliberately,
resolves conflicts, runs integration verification, and emits `integration-summary.json`.

Implementation agents must not merge into sibling branches directly.
