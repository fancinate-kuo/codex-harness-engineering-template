import {
  overview as filesystemOverview,
  taskList as filesystemTaskList,
  taskDetail as filesystemTaskDetail,
  readJson as filesystemReadJson,
} from './read-model.mjs'
import {
  dbOverview,
  dbTaskList,
  dbTaskDetail,
} from './db-read-model.mjs'
import { resolveRuntimeStoreMode } from '../../persistence/lib/runtime-store.mjs'

const filesystemAdapter = {
  overview: filesystemOverview,
  taskList: filesystemTaskList,
  taskDetail: filesystemTaskDetail,
  evaluationSummary: () => filesystemReadJson(
    '.codex/evaluation/results/summary.json',
    { count: 0, passRate: 0 },
  ),
}

const postgresAdapter = {
  overview: dbOverview,
  taskList: dbTaskList,
  taskDetail: dbTaskDetail,
  evaluationSummary: () => filesystemReadJson(
    '.codex/evaluation/results/summary.json',
    { count: 0, passRate: 0 },
  ),
}

export function createRuntimeReadModel({
  env = process.env,
  filesystem = filesystemAdapter,
  postgres = postgresAdapter,
} = {}) {
  const mode = resolveRuntimeStoreMode(env)
  const adapter = mode === 'postgres' ? postgres : filesystem
  return {
    mode,
    overview: () => Promise.resolve(adapter.overview()),
    taskList: () => Promise.resolve(adapter.taskList()),
    taskDetail: (taskId) => Promise.resolve(adapter.taskDetail(taskId)),
    evaluationSummary: () => Promise.resolve(adapter.evaluationSummary()),
  }
}

export { resolveRuntimeStoreMode }
