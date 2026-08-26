import { spawnSync } from 'node:child_process'
import { basename } from 'node:path'

export const PINNED_GITNEXUS_VERSION = '1.6.9'

export function getGitNexusRepositoryName(root = process.cwd()) {
  return process.env.GITNEXUS_REPO || basename(root)
}

export function getPnpmExecutable(platform = process.platform) {
  return platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
}

export function buildGitNexusCommand(args = []) {
  if (!Array.isArray(args)) {
    throw new TypeError('GitNexus arguments must be an array')
  }

  return ['exec', 'gitnexus', ...args]
}

export function runGitNexus(args = [], options = {}) {
  const {
    platform = process.platform,
    spawn = spawnSync,
    ...spawnOptions
  } = options

  return spawn(getPnpmExecutable(platform), buildGitNexusCommand(args), {
    encoding: 'utf8',
    // Windows exposes pnpm as a .cmd shim; shell execution is required for
    // that shim. Ubuntu uses direct process spawning.
    shell: platform === 'win32',
    ...spawnOptions
  })
}

export function commandExitCode(result) {
  if (result?.error) return 1
  if (typeof result?.status === 'number') return result.status
  return 1
}

export function commandOutput(result) {
  return `${result?.stdout ?? ''}${result?.stderr ?? ''}`
}

export function writeCommandResult(result, io = { stdout: process.stdout, stderr: process.stderr }) {
  if (result?.stdout) io.stdout.write(result.stdout)
  if (result?.stderr) io.stderr.write(result.stderr)
  if (result?.error && !result?.stderr) io.stderr.write(`${result.error.message}\n`)
}
