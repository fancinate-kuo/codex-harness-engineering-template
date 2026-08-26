# Worktree Strategy

Use a dedicated git worktree for each mutable implementation task.

Example:

```bash
git worktree add ../worktrees/feat-forum-pin -b feat/forum-pin
```

Recommended path:

`.codex/worktrees/<task-id>/`

Do not let multiple implementation agents mutate the same worktree.

Read-only agents such as Planner/Impact/Review may inspect the main checkout
or a snapshot, but should not modify the implementation branch unless explicitly assigned.
