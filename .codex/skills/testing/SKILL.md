# Testing Skill

Use the narrowest useful layer first:
- unit
- integration
- e2e

For UI behavior changes, prefer Playwright coverage for the user-visible contract.
Avoid duplicating identical assertions across all test layers.
