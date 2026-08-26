import { spawnSync } from 'node:child_process'
import { resolveRuntimeStoreMode } from '../persistence/lib/runtime-store.mjs'

const taskId = process.argv[2]
if (!taskId) {
  console.error('Usage: node scripts/control-plane/runtime-run.mjs TASK-001')
  process.exit(2)
}

const scheduler = spawnSync(
  process.execPath,
  ['scripts/orchestration/dynamic-scheduler.mjs', taskId],
  { stdio: 'inherit', shell: false },
)

let status = scheduler.status ?? 1
try {
  if (resolveRuntimeStoreMode() === 'postgres') {
    const persisted = spawnSync(
      process.execPath,
      ['scripts/persistence/persist-snapshot.mjs', taskId],
      { stdio: 'inherit', shell: false },
    )
    if ((persisted.status ?? 1) !== 0) status = persisted.status ?? 1
  }
} catch (error) {
  console.error(`Runtime persistence failed: ${error.message}`)
  status = 1
}

process.exit(status)
