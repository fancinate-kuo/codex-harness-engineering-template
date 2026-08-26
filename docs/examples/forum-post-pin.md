# Example: Forum Post Pinning

User request:

> Moderators can pin a forum post.

Suggested graph path:

REQ-FORUM-002
→ forum.post.pin
→ forum.moderation
→ forum
→ PATCH /posts/:id/pin
→ PostModerationService.pin
→ forum_posts
→ integration/e2e tests

Agent flow:

1. Add/resolve requirement and feature.
2. Query Business Graph.
3. Query GitNexus for `PostModerationService`.
4. Run impact analysis.
5. Read moderation ADR/rules.
6. Implement minimal change.
7. Add integration + Playwright coverage.
8. Run `detect_changes`.
9. Refresh Business Graph + GitNexus.
10. Run Harness Gate.
