import { query, transaction } from "./db.mjs";
import { appendEvent } from "./event-store.mjs";

export async function upsertTask(task) {
  await query(
    `INSERT INTO harness.tasks
      (id,title,state,priority,requirement_id,feature_id,assigned_agent,worktree,created_at,updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (id) DO UPDATE SET
       title=EXCLUDED.title,
       state=EXCLUDED.state,
       priority=EXCLUDED.priority,
       requirement_id=EXCLUDED.requirement_id,
       feature_id=EXCLUDED.feature_id,
       assigned_agent=EXCLUDED.assigned_agent,
       worktree=EXCLUDED.worktree,
       updated_at=EXCLUDED.updated_at`,
    [
      task.id, task.title, task.state, task.priority || "normal",
      task.requirementId || null, task.featureId || null,
      task.assignedAgent || null, task.worktree || null,
      task.createdAt || new Date().toISOString(),
      task.updatedAt || new Date().toISOString()
    ]
  );

  await appendEvent({
    taskId: task.id,
    type: "task.upserted",
    aggregateType: "task",
    aggregateId: task.id,
    payload: task
  });
}

export async function saveDag(taskId, workflow, state) {
  await transaction(async client => {
    await client.query(
      `INSERT INTO harness.dag_runs
        (task_id, workflow_name, workflow_json, state_json)
       VALUES ($1,$2,$3::jsonb,$4::jsonb)`,
      [taskId, workflow?.name || "unknown", JSON.stringify(workflow||{}), JSON.stringify(state||{})]
    );

    for (const node of workflow?.nodes || []) {
      const ns = state?.nodes?.[node.id] || {};
      await client.query(
        `INSERT INTO harness.node_runs
          (task_id,node_id,agent,role,status,retry_count,worktree,thread_id,started_at,finished_at,metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
         ON CONFLICT (task_id,node_id) DO UPDATE SET
          agent=EXCLUDED.agent,
          role=EXCLUDED.role,
          status=EXCLUDED.status,
          retry_count=EXCLUDED.retry_count,
          worktree=EXCLUDED.worktree,
          thread_id=EXCLUDED.thread_id,
          started_at=EXCLUDED.started_at,
          finished_at=EXCLUDED.finished_at,
          metadata=EXCLUDED.metadata`,
        [
          taskId,node.id,node.agent||null,node.role||null,
          ns.status||"pending",ns.retryCount||0,ns.worktree||null,ns.threadId||null,
          ns.startedAt||null,ns.finishedAt||null,
          JSON.stringify({dependsOn:node.dependsOn||[],mutable:Boolean(node.mutable)})
        ]
      );
    }
  });

  await appendEvent({
    taskId,
    type: "dag.persisted",
    aggregateType: "dag",
    aggregateId: taskId,
    payload: {workflowName: workflow?.name, nodeCount: workflow?.nodes?.length || 0}
  });
}

export async function saveApproval(taskId, approval) {
  await query(
    `INSERT INTO harness.approvals
      (task_id,decision,requested_at,decided_at,decided_by,reason,scope)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
    [
      taskId, approval.decision, approval.requestedAt,
      approval.decidedAt || null, approval.decidedBy || null,
      approval.reason || null, JSON.stringify(approval.scope || [])
    ]
  );
  await appendEvent({
    taskId,
    type:`approval.${approval.decision}`,
    aggregateType:"approval",
    aggregateId:taskId,
    payload:approval
  });
}

export async function listTasks() {
  const r=await query(
    `SELECT id,title,state,priority,requirement_id,feature_id,assigned_agent,worktree,created_at,updated_at
       FROM harness.tasks
      ORDER BY updated_at DESC`
  );
  return r.rows;
}
