CREATE TABLE IF NOT EXISTS harness.task_leases (
  task_id TEXT PRIMARY KEY REFERENCES harness.tasks(id) ON DELETE CASCADE,
  owner TEXT NOT NULL,
  lease_token TEXT NOT NULL UNIQUE,
  acquired_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_task_leases_expires_at
  ON harness.task_leases(expires_at);

CREATE TABLE IF NOT EXISTS harness.idempotency_keys (
  scope TEXT NOT NULL,
  key TEXT NOT NULL,
  response_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (scope, key)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires_at
  ON harness.idempotency_keys(expires_at);
