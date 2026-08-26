import { query } from "../../persistence/lib/db.mjs";

function iso(value) {
  return value?.toISOString?.() ?? value ?? null;
}

function mapTask(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    state: row.state,
    priority: row.priority,
    requirementId: row.requirement_id,
    featureId: row.feature_id,
    assignedAgent: row.assigned_agent,
    worktree: row.worktree,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at)
  };
}

function mapApproval(row) {
  if (!row) return null;
  return {
    taskId: row.task_id,
    decision: row.decision,
    requestedAt: iso(row.requested_at),
    decidedAt: iso(row.decided_at),
    decidedBy: row.decided_by,
    reason: row.reason,
    scope: row.scope ?? []
  };
}

export async function dbOverview() {
  const [tasks, approvals] = await Promise.all([
    query(`SELECT state, count(*)::int AS count FROM harness.tasks GROUP BY state`),
    query(`SELECT count(*)::int AS count FROM harness.approvals WHERE decision='pending'`)
  ]);

  const taskStates = Object.fromEntries(tasks.rows.map(r => [r.state, r.count]));
  const total = Object.values(taskStates).reduce((sum, count) => sum + count, 0);
  const running = ["planning", "impact_analysis", "implementing", "testing", "reviewing", "fixing", "ready_for_pr"]
    .reduce((sum, state) => sum + (taskStates[state] || 0), 0);
  const blocked = (taskStates.blocked || 0) + (taskStates.failed || 0);

  return {
    taskCounts: { total, running, blocked },
    pendingApprovals: approvals.rows[0]?.count || 0,
    benchmarkPassRate: 0,
    taskStates
  };
}

export async function dbTaskList() {
  const result = await query(
    `SELECT id,title,state,priority,requirement_id,feature_id,assigned_agent,worktree,created_at,updated_at
       FROM harness.tasks
      ORDER BY updated_at DESC`
  );
  return result.rows.map(mapTask);
}

export async function dbTask(taskId) {
  const [task,nodeRuns,approval] = await Promise.all([
    query(`SELECT * FROM harness.tasks WHERE id=$1`,[taskId]),
    query(`SELECT * FROM harness.node_runs WHERE task_id=$1 ORDER BY id`,[taskId]),
    query(`SELECT * FROM harness.approvals WHERE task_id=$1 ORDER BY id DESC LIMIT 1`,[taskId])
  ]);

  return {
    task: mapTask(task.rows[0]),
    nodeRuns: nodeRuns.rows,
    approval: mapApproval(approval.rows[0])
  };
}

export async function dbTaskDetail(taskId) {
  const [task, dag, nodeRuns, approval, feedback, metrics, audit, tokenCost] = await Promise.all([
    query(`SELECT * FROM harness.tasks WHERE id=$1`, [taskId]),
    query(`SELECT workflow_json,state_json FROM harness.dag_runs WHERE task_id=$1 ORDER BY id DESC LIMIT 1`, [taskId]),
    query(`SELECT * FROM harness.node_runs WHERE task_id=$1 ORDER BY id`, [taskId]),
    query(`SELECT * FROM harness.approvals WHERE task_id=$1 ORDER BY id DESC LIMIT 1`, [taskId]),
    query(`SELECT * FROM harness.feedback_events WHERE task_id=$1 ORDER BY created_at`, [taskId]),
    query(`SELECT * FROM harness.metrics WHERE task_id=$1 ORDER BY created_at`, [taskId]),
    query(`SELECT * FROM harness.audit_events WHERE task_id=$1 ORDER BY created_at`, [taskId]),
    query(`SELECT * FROM harness.token_cost WHERE task_id=$1 ORDER BY created_at`, [taskId])
  ]);

  const taskRow = mapTask(task.rows[0]);
  if (!taskRow) return { task: null };
  const dagRow = dag.rows[0];

  return {
    task: taskRow,
    run: null,
    dag: dagRow?.state_json ?? null,
    workflow: dagRow?.workflow_json ?? null,
    approval: mapApproval(approval.rows[0]),
    policy: null,
    risk: null,
    observability: { source: "postgres", metricCount: metrics.rows.length },
    metrics: metrics.rows.map(row => ({
      taskId: row.task_id,
      nodeId: row.node_id,
      agent: row.agent,
      type: row.type,
      value: row.value_json,
      durationMs: row.duration_ms,
      status: row.status,
      timestamp: iso(row.created_at)
    })),
    audit: audit.rows.map(row => ({
      taskId: row.task_id,
      actor: row.actor,
      action: row.action,
      reason: row.reason,
      evidence: row.evidence,
      before: row.before_json,
      after: row.after_json,
      timestamp: iso(row.created_at)
    })),
    tokenCost: tokenCost.rows.map(row => ({
      taskId: row.task_id,
      nodeId: row.node_id,
      agent: row.agent,
      model: row.model,
      inputTokens: Number(row.input_tokens || 0),
      outputTokens: Number(row.output_tokens || 0),
      cachedInputTokens: Number(row.cached_input_tokens || 0),
      estimatedCostUsd: row.estimated_cost_usd == null ? null : Number(row.estimated_cost_usd),
      timestamp: iso(row.created_at)
    })),
    memory: null,
    feedback: feedback.rows.map(row => ({
      taskId: row.task_id,
      source: row.source,
      status: row.status,
      summary: row.summary,
      classification: row.classification,
      evidence: row.evidence,
      createdAt: iso(row.created_at)
    }))
  };
}
