import { transaction } from './db.mjs'

const DECISIONS = new Set(['approved', 'rejected'])

export async function decidePostgresApproval(
  taskId,
  decision,
  decidedBy,
  reason,
  { transaction: runTransaction = transaction } = {},
) {
  if (!taskId || !DECISIONS.has(decision)) throw new Error('Invalid approval decision')
  if (!decidedBy || decidedBy.length > 128) throw new Error('Invalid approval actor')

  return runTransaction(async (client) => {
    const updated = await client.query(
      `UPDATE harness.approvals
          SET decision=$2, decided_at=now(), decided_by=$3, reason=$4
        WHERE id=(SELECT id FROM harness.approvals WHERE task_id=$1 ORDER BY id DESC LIMIT 1)
          AND decision='pending'
      RETURNING task_id, decision, requested_at, decided_at, decided_by, reason, scope`,
      [taskId, decision, decidedBy, reason || null],
    )
    if (!updated.rows[0]) {
      const error = new Error(`No pending PostgreSQL approval exists for task: ${taskId}`)
      error.code = 'APPROVAL_NOT_PENDING'
      throw error
    }

    const row = updated.rows[0]
    await client.query(
      `INSERT INTO harness.events
        (task_id, type, aggregate_type, aggregate_id, payload, metadata)
       VALUES ($1,$2,'approval',$1,$3::jsonb,$4::jsonb)`,
      [taskId, `approval.${decision}`, JSON.stringify({ taskId, decision, decidedBy, reason }), JSON.stringify({ source: 'control-plane' })],
    )
    return {
      taskId: row.task_id,
      decision: row.decision,
      requestedAt: row.requested_at,
      decidedAt: row.decided_at,
      decidedBy: row.decided_by,
      reason: row.reason,
      scope: row.scope ?? [],
    }
  })
}
