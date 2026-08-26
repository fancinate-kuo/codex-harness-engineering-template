# Failure Handling

The v5 runner persists state before each stage.

If interrupted:
- no stage history is lost,
- shared artifacts remain,
- worktree remains,
- rerunning `harness:run` recalculates the next stage.

For retryable failures:
- record stage failure with `harness:stage:result`,
- fix transient issues,
- rerun the task.

The runner deliberately avoids hiding repeated failures.
Complex failure policy can be added later as a pluggable scheduler policy.
