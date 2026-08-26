import { query } from "../../persistence/lib/db.mjs";

export async function dbOverview() {
  const [tasks, approvals] = await Promise.all([
    query(`SELECT state, count(*)::int AS count FROM harness.tasks GROUP BY state`),
    query(`SELECT count(*)::int AS count FROM harness.approvals WHERE decision='pending'`)
  ]);

  return {
    taskStates:Object.fromEntries(tasks.rows.map(r=>[r.state,r.count])),
    pendingApprovals:approvals.rows[0]?.count || 0
  };
}

export async function dbTask(taskId) {
  const [task,nodeRuns,approval] = await Promise.all([
    query(`SELECT * FROM harness.tasks WHERE id=$1`,[taskId]),
    query(`SELECT * FROM harness.node_runs WHERE task_id=$1 ORDER BY id`,[taskId]),
    query(`SELECT * FROM harness.approvals WHERE task_id=$1 ORDER BY id DESC LIMIT 1`,[taskId])
  ]);

  return {
    task:task.rows[0] || null,
    nodeRuns:nodeRuns.rows,
    approval:approval.rows[0] || null
  };
}
