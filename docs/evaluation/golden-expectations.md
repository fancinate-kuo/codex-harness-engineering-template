# Golden Expectations

Golden expectations should test Harness behavior, not implementation trivia.

Good:
- UI behavior change includes Playwright
- auth boundary change includes security review
- docs-only task does not create migration work
- high-risk task requires governance checks

Bad:
- exact prompt wording
- exact ordering where parallelism is valid
- exact token count
- exact internal model phrasing
