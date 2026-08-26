CREATE SCHEMA IF NOT EXISTS harness;

CREATE TABLE IF NOT EXISTS harness.tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  state TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  requirement_id TEXT,
  feature_id TEXT,
  assigned_agent TEXT,
  worktree TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS harness.dag_runs (
  id BIGSERIAL PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES harness.tasks(id) ON DELETE CASCADE,
  workflow_name TEXT NOT NULL,
  workflow_json JSONB NOT NULL,
  state_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS harness.node_runs (
  id BIGSERIAL PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES harness.tasks(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  agent TEXT,
  role TEXT,
  status TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  worktree TEXT,
  thread_id TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(task_id, node_id)
);

CREATE TABLE IF NOT EXISTS harness.approvals (
  id BIGSERIAL PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES harness.tasks(id) ON DELETE CASCADE,
  decision TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL,
  decided_at TIMESTAMPTZ,
  decided_by TEXT,
  reason TEXT,
  scope JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS harness.feedback_events (
  id BIGSERIAL PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES harness.tasks(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  status TEXT NOT NULL,
  summary TEXT,
  classification TEXT,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS harness.metrics (
  id BIGSERIAL PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES harness.tasks(id) ON DELETE CASCADE,
  node_id TEXT,
  agent TEXT,
  type TEXT NOT NULL,
  value_json JSONB,
  duration_ms DOUBLE PRECISION,
  status TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS harness.token_cost (
  id BIGSERIAL PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES harness.tasks(id) ON DELETE CASCADE,
  node_id TEXT,
  agent TEXT,
  model TEXT,
  input_tokens BIGINT NOT NULL DEFAULT 0,
  output_tokens BIGINT NOT NULL DEFAULT 0,
  cached_input_tokens BIGINT NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC(18,8),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS harness.audit_events (
  id BIGSERIAL PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES harness.tasks(id) ON DELETE CASCADE,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  reason TEXT,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  before_json JSONB,
  after_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS harness.memory_records (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  scope JSONB NOT NULL DEFAULT '{}'::jsonb,
  source JSONB NOT NULL,
  confidence TEXT NOT NULL,
  status TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  supersedes TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS harness.events (
  sequence BIGSERIAL PRIMARY KEY,
  task_id TEXT,
  type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_task_sequence
  ON harness.events(task_id, sequence);

CREATE INDEX IF NOT EXISTS idx_metrics_task_created
  ON harness.metrics(task_id, created_at);

CREATE INDEX IF NOT EXISTS idx_audit_task_created
  ON harness.audit_events(task_id, created_at);

CREATE INDEX IF NOT EXISTS idx_feedback_task_created
  ON harness.feedback_events(task_id, created_at);
