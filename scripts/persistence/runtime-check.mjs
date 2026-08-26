import { resolveRuntimeStoreMode } from './lib/runtime-store.mjs'

try {
  const mode = resolveRuntimeStoreMode()
  console.log(JSON.stringify({
    runtimeStore: mode,
    postgresConfigured: Boolean(process.env.HARNESS_DATABASE_URL),
    contract: 'filesystem fallback / postgres production adapter',
  }, null, 2))
} catch (error) {
  console.error(`Runtime store configuration FAILED: ${error.message}`)
  process.exitCode = 1
}
