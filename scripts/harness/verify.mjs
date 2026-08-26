import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const REQUIRED_GATES = Object.freeze([
  ['lint', ['run', 'lint']],
  ['typecheck', ['run', 'typecheck']],
  ['unit', ['run', 'test:unit']],
  ['integration', ['run', 'test:integration']],
  ['architecture', ['run', 'test:architecture']],
  ['control-build', ['run', 'control:build']],
  ['e2e', ['run', 'test:e2e']],
  ['repo-map', ['run', 'harness:repo-map']],
  ['business-graph', ['run', 'graph:business:validate']],
  ['memory', ['run', 'harness:memory:validate']]
])

export function isCiEnvironment(environment = process.env) {
  return environment.CI === 'true' || environment.CI === '1'
}

export function shouldRejectGraphSkip(environment = process.env) {
  return environment.HARNESS_SKIP_GRAPH === '1' && isCiEnvironment(environment)
}

export function runGate(name, args, spawn = spawnSync) {
  console.log(`\n== Harness Gate: ${name} ==`)
  const result = spawn('pnpm', args, {
    stdio: 'inherit',
    shell: process.platform === 'win32'
  })
  return result.status ?? 1
}

export function runHarnessVerify(environment = process.env, spawn = spawnSync) {
  if (shouldRejectGraphSkip(environment)) {
    console.error('Harness Gate FAILED: HARNESS_SKIP_GRAPH=1 is not allowed in CI.')
    return 1
  }

  for (const [name, args] of REQUIRED_GATES) {
    const status = runGate(name, args, spawn)
    if (status !== 0) {
      console.error(`Harness Gate FAILED at: ${name}`)
      return status
    }
  }

  if (environment.HARNESS_SKIP_GRAPH !== '1') {
    console.log('\n== Harness Gate: graph freshness ==')
    const status = runGate('graph freshness', ['run', 'graph:status'], spawn)
    if (status !== 0) {
      console.error('Harness Gate FAILED at: graph freshness')
      console.error('Run `pnpm graph:analyze`, or use HARNESS_SKIP_GRAPH=1 only for local bootstrap.')
      return status
    }
  } else {
    console.log('\n== Harness Gate: graph freshness SKIPPED for local bootstrap ==')
  }

  console.log('\nHarness Gate = PASS')
  return 0
}

const currentFile = fileURLToPath(import.meta.url)
if (process.argv[1] && resolve(process.argv[1]) === currentFile) {
  process.exit(runHarnessVerify())
}
