import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const UNHEALTHY_PATTERNS = [
  /not indexed/i,
  /not a git repository/i,
  /graph (?:is )?(?:unavailable|stale|outdated)/i,
  /index (?:is )?(?:missing|stale|outdated)/i,
  /run: gitnexus analyze/i,
  /run gitnexus analyze/i
]

export function isUnhealthyOutput(output) {
  return UNHEALTHY_PATTERNS.some(pattern => pattern.test(output))
}

export function statusExitCode(result) {
  if (result.error) return 1
  if (typeof result.status === 'number' && result.status !== 0) return result.status
  return isUnhealthyOutput(`${result.stdout ?? ''}\n${result.stderr ?? ''}`) ? 1 : 0
}

export function runGraphStatus(spawn = spawnSync) {
  const result = spawn('npx', ['-y', 'gitnexus@latest', 'status'], {
    encoding: 'utf8',
    shell: process.platform === 'win32'
  })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
  process.stdout.write(output)

  const exitCode = statusExitCode(result)
  if (exitCode !== 0) {
    console.error('')
    console.error('GitNexus graph is unavailable or stale.')
    console.error('Run: pnpm graph:analyze')
  }
  return exitCode
}

const currentFile = fileURLToPath(import.meta.url)
if (process.argv[1] && resolve(process.argv[1]) === currentFile) {
  console.log('== Graph Status ==')
  console.log('Provider: GitNexus')
  process.exit(runGraphStatus())
}
