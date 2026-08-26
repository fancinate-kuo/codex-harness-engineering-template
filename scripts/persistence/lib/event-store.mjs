import { query } from "./db.mjs";

export async function appendEvent({
  taskId=null,
  type,
  aggregateType,
  aggregateId,
  payload={},
  metadata={}
}) {
  const r = await query(
    `INSERT INTO harness.events
      (task_id, type, aggregate_type, aggregate_id, payload, metadata)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb)
     RETURNING sequence, created_at`,
    [
      taskId,
      type,
      aggregateType,
      aggregateId,
      JSON.stringify(payload),
      JSON.stringify(metadata)
    ]
  );
  return r.rows[0];
}

export async function loadEvents(taskId, afterSequence=0) {
  const r = await query(
    `SELECT sequence, task_id, type, aggregate_type, aggregate_id,
            payload, metadata, created_at
       FROM harness.events
      WHERE ($1::text IS NULL OR task_id=$1)
        AND sequence>$2
      ORDER BY sequence ASC`,
    [taskId, afterSequence]
  );
  return r.rows;
}
