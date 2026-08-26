import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  commandExitCode,
  commandOutput,
  runGitNexus,
  writeCommandResult
} from './command.mjs'

const UNHEALTHY_PATTERNS = [
  /not indexed/i,
  /not a git repository/i,
  /(?:graph|index|workspace index|repository).*(?:unavailable|stale|outdated|missing)/i,
  /status\s*:\s*.*\bstale\b/i,
  /could not find.*index/i,
  /run: gitnexus analyze/i,
  /run gitnexus analyze/i
]

export function isUnhealthyOutput(output) {
  return UNHEALTHY_PATTERNS.some(pattern => pattern.test(output))
}

export function statusExitCode(result) {
  const processExitCode = commandExitCode(result)
  if (processExitCode !== 0) return processExitCode
  return isUnhealthyOutput(commandOutput(result)) ? 1 : 0
}

export function runGraphStatus(
  run = runGitNexus,
  io = { stdout: process.stdout, stderr: process.stderr }
) {
  const result = run(['status'])
  writeCommandResult(result, io)

  const exitCode = statusExitCode(result)
  if (exitCode !== 0) {
    io.stderr.write('\nGitNexus graph is unavailable or stale.\n')
    io.stderr.write('Run: pnpm graph:analyze\n')
  }
  return exitCode
}

const currentFile = fileURLToPath(import.meta.url)
if (process.argv[1] && resolve(process.argv[1]) === currentFile) {
  console.log('== Graph Status ==')
  console.log('Provider: GitNexus')
  process.exit(runGraphStatus())
}
