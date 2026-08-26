CREATE INDEX IF NOT EXISTS idx_tasks_state ON harness.tasks(state);
CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON harness.tasks(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_node_runs_status ON harness.node_runs(status);
CREATE INDEX IF NOT EXISTS idx_approvals_task_decision ON harness.approvals(task_id, decision);
CREATE INDEX IF NOT EXISTS idx_memory_status_kind ON harness.memory_records(status, kind);
