import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runGraphAnalyze } from './analyze.mjs'

export function runGraphBuild(
  args = [],
  run,
  io = { stdout: process.stdout, stderr: process.stderr }
) {
  return runGraphAnalyze(args, run, io)
}

const currentFile = fileURLToPath(import.meta.url)
if (process.argv[1] && resolve(process.argv[1]) === currentFile) {
  console.log('== GitNexus Graph Build ==')
  process.exit(runGraphBuild(process.argv.slice(2)))
}
