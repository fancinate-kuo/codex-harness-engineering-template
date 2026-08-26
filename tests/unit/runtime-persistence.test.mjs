import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  createRuntimeReadModel,
  resolveRuntimeStoreMode,
} from '../../scripts/control-plane/lib/runtime-read-model.mjs'
import {
  acquireTaskLease,
  rememberIdempotency,
} from '../../scripts/persistence/lib/runtime-coordination.mjs'
import { decidePostgresApproval } from '../../scripts/persistence/lib/approval.mjs'

const rootDir = path.resolve(import.meta.dirname, '../..')

describe('runtime store contract', () => {
  it('selects filesystem by default and PostgreSQL when explicitly configured', () => {
    expect(resolveRuntimeStoreMode({})).toBe('filesystem')
    expect(resolveRuntimeStoreMode({ HARNESS_DATABASE_URL: 'postgres://db' })).toBe('postgres')
    expect(resolveRuntimeStoreMode({ HARNESS_RUNTIME_STORE: 'filesystem', HARNESS_DATABASE_URL: 'postgres://db' }))
      .toBe('filesystem')
    expect(() => resolveRuntimeStoreMode({ HARNESS_RUNTIME_STORE: 'postgres' }))
      .toThrow('HARNESS_DATABASE_URL')
    expect(() => resolveRuntimeStoreMode({ HARNESS_RUNTIME_STORE: 'redis' }))
      .toThrow('HARNESS_RUNTIME_STORE')
  })

  it('keeps the Control Plane read model independent of the selected adapter', async () => {
    const filesystem = {
      overview: () => ({ source: 'filesystem' }),
      taskList: () => [{ id: 'FS-1' }],
      taskDetail: () => ({ task: { id: 'FS-1' } }),
      evaluationSummary: () => ({ source: 'filesystem' }),
    }
    const postgres = {
      overview: async () => ({ source: 'postgres' }),
      taskList: async () => [{ id: 'PG-1' }],
      taskDetail: async () => ({ task: { id: 'PG-1' } }),
      evaluationSummary: async () => ({ source: 'postgres' }),
    }

    const store = createRuntimeReadModel({
      env: { HARNESS_RUNTIME_STORE: 'postgres', HARNESS_DATABASE_URL: 'postgres://db' },
      filesystem,
      postgres,
    })

    expect(store.mode).toBe('postgres')
    await expect(store.overview()).resolves.toEqual({ source: 'postgres' })
    await expect(store.taskList()).resolves.toEqual([{ id: 'PG-1' }])
  })
})

describe('PostgreSQL runtime coordination contract', () => {
  it('returns a lease when the task is available', async () => {
    const transaction = async (work) => work({
      query: async () => ({
        rows: [{ task_id: 'TASK-1', owner: 'scheduler-a', lease_token: 'lease-1' }],
      }),
    })

    await expect(acquireTaskLease('TASK-1', 'scheduler-a', { transaction })).resolves.toMatchObject({
      taskId: 'TASK-1',
      owner: 'scheduler-a',
      leaseToken: 'lease-1',
    })
  })

  it('rejects a task lease when another owner still holds it', async () => {
    const transaction = async (work) => work({ query: async () => ({ rows: [] }) })

    await expect(acquireTaskLease('TASK-1', 'scheduler-b', { transaction }))
      .rejects.toMatchObject({ code: 'LEASE_UNAVAILABLE' })
  })

  it('returns the stored response for a repeated idempotency key', async () => {
    const transaction = async (work) => work({
      query: async (sql) => sql.includes('INSERT')
        ? { rows: [] }
        : { rows: [{ response_json: { accepted: true }, replayed: true }] },
    })

    await expect(rememberIdempotency('run', 'request-1', { taskId: 'TASK-1' }, { transaction }))
      .resolves.toEqual({ response: { accepted: true }, replayed: true })
  })

  it('updates a pending approval and appends an audit event in one transaction', async () => {
    const transaction = async (work) => work({
      query: async (sql) => sql.includes('UPDATE')
        ? { rows: [{ task_id: 'TASK-1', decision: 'approved', decided_by: 'reviewer', scope: [] }] }
        : { rows: [] },
    })

    await expect(decidePostgresApproval('TASK-1', 'approved', 'reviewer', 'Looks good', { transaction }))
      .resolves.toMatchObject({ taskId: 'TASK-1', decision: 'approved', decidedBy: 'reviewer' })
  })
})

describe('runtime migration contract', () => {
  it('defines coordination tables and migration tracking', () => {
    const migration = fs.readFileSync(
      path.join(rootDir, 'db/migrations/003_runtime_coordination.sql'),
      'utf8',
    )
    const runner = fs.readFileSync(path.join(rootDir, 'scripts/persistence/migrate.mjs'), 'utf8')

    expect(migration).toContain('harness.task_leases')
    expect(migration).toContain('harness.idempotency_keys')
    expect(runner).toContain('schema_migrations')
  })
})
