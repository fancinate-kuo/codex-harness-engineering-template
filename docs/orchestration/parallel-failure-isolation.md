# Parallel Failure Isolation

- every mutable branch gets a dedicated worktree
- failure in one branch does not mutate siblings
- downstream joins remain blocked until required dependencies resolve
- retries are scoped to the failed node
- skipped conditional nodes can satisfy explicitly configured joins
