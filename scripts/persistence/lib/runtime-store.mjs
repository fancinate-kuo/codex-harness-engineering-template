const RUNTIME_STORE_MODES = new Set(['filesystem', 'postgres'])

export function resolveRuntimeStoreMode(environment = process.env) {
  const requested = String(
    environment.HARNESS_RUNTIME_STORE ??
      (environment.HARNESS_DATABASE_URL ? 'postgres' : 'filesystem'),
  ).toLowerCase()

  if (!RUNTIME_STORE_MODES.has(requested)) {
    throw new Error('HARNESS_RUNTIME_STORE must be filesystem or postgres')
  }
  if (requested === 'postgres' && !environment.HARNESS_DATABASE_URL) {
    throw new Error('HARNESS_DATABASE_URL is required when HARNESS_RUNTIME_STORE=postgres')
  }
  return requested
}

export function isPostgresRuntime(environment = process.env) {
  return resolveRuntimeStoreMode(environment) === 'postgres'
}
