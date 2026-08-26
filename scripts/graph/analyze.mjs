import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  commandExitCode,
  runGitNexus,
  writeCommandResult
} from './command.mjs'

export function buildAnalyzeArgs(args = []) {
  const extraArgs = Array.isArray(args) ? [...args] : []
  if (!extraArgs.includes('--index-only')) extraArgs.unshift('--index-only')
  return ['analyze', ...extraArgs]
}

export function runGraphAnalyze(
  args = [],
  run = runGitNexus,
  io = { stdout: process.stdout, stderr: process.stderr }
) {
  const result = run(buildAnalyzeArgs(args))
  writeCommandResult(result, io)
  return commandExitCode(result)
}

const currentFile = fileURLToPath(import.meta.url)
if (process.argv[1] && resolve(process.argv[1]) === currentFile) {
  console.log('== GitNexus Analyze (index-only) ==')
  process.exit(runGraphAnalyze(process.argv.slice(2)))
}
