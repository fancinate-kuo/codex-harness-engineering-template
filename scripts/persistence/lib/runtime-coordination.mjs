import { randomUUID } from 'node:crypto'
import { transaction } from './db.mjs'

function validateToken(value, field) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value)) {
    throw new Error(`${field} is invalid`)
  }
}

export async function acquireTaskLease(
  taskId,
  owner,
  { transaction: runTransaction = transaction, leaseToken = randomUUID(), leaseSeconds = 60 } = {},
) {
  validateToken(taskId, 'taskId')
  validateToken(owner, 'owner')
  validateToken(leaseToken, 'leaseToken')
  if (!Number.isInteger(leaseSeconds) || leaseSeconds < 1 || leaseSeconds > 86_400) {
    throw new Error('leaseSeconds must be between 1 and 86400')
  }

  const result = await runTransaction((client) => client.query(
    `INSERT INTO harness.task_leases
      (task_id, owner, lease_token, acquired_at, expires_at, updated_at)
     VALUES ($1, $2, $3, now(), now() + ($4 * interval '1 second'), now())
     ON CONFLICT (task_id) DO UPDATE SET
       owner=EXCLUDED.owner,
       lease_token=EXCLUDED.lease_token,
       acquired_at=EXCLUDED.acquired_at,
       expires_at=EXCLUDED.expires_at,
       updated_at=EXCLUDED.updated_at
     WHERE harness.task_leases.expires_at <= now()
        OR harness.task_leases.owner = EXCLUDED.owner
     RETURNING task_id, owner, lease_token, acquired_at, expires_at`,
    [taskId, owner, leaseToken, leaseSeconds],
  ))

  const row = result.rows[0]
  if (!row) {
    const error = new Error(`Task lease is held by another owner: ${taskId}`)
    error.code = 'LEASE_UNAVAILABLE'
    throw error
  }
  return {
    taskId: row.task_id,
    owner: row.owner,
    leaseToken: row.lease_token,
    acquiredAt: row.acquired_at,
    expiresAt: row.expires_at,
  }
}

export async function releaseTaskLease(
  taskId,
  owner,
  leaseToken,
  { transaction: runTransaction = transaction } = {},
) {
  validateToken(taskId, 'taskId')
  validateToken(owner, 'owner')
  validateToken(leaseToken, 'leaseToken')
  const result = await runTransaction((client) => client.query(
    `DELETE FROM harness.task_leases
      WHERE task_id=$1 AND owner=$2 AND lease_token=$3
      RETURNING task_id`,
    [taskId, owner, leaseToken],
  ))
  return result.rowCount === 1
}

export async function rememberIdempotency(
  scope,
  key,
  response,
  { transaction: runTransaction = transaction, ttlSeconds = 86_400 } = {},
) {
  validateToken(scope, 'scope')
  validateToken(key, 'idempotency key')
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 1 || ttlSeconds > 2_592_000) {
    throw new Error('ttlSeconds must be between 1 and 2592000')
  }

  return runTransaction(async (client) => {
    const inserted = await client.query(
      `INSERT INTO harness.idempotency_keys
        (scope, key, response_json, created_at, expires_at)
       VALUES ($1, $2, $3::jsonb, now(), now() + ($4 * interval '1 second'))
       ON CONFLICT (scope, key) DO NOTHING
       RETURNING response_json`,
      [scope, key, JSON.stringify(response), ttlSeconds],
    )
    if (inserted.rows[0]) return { response: inserted.rows[0].response_json, replayed: false }

    const existing = await client.query(
      `SELECT response_json FROM harness.idempotency_keys
        WHERE scope=$1 AND key=$2 AND expires_at > now()`,
      [scope, key],
    )
    if (!existing.rows[0]) {
      const error = new Error(`Idempotency key expired during claim: ${scope}/${key}`)
      error.code = 'IDEMPOTENCY_EXPIRED'
      throw error
    }
    return { response: existing.rows[0].response_json, replayed: true }
  })
}
