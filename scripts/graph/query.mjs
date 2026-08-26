import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  commandExitCode,
  getGitNexusRepositoryName,
  runGitNexus,
  writeCommandResult
} from './command.mjs'

export const QUERY_TYPES = ['context', 'impact', 'query', 'changes', 'cypher']

function invalidQuery(message) {
  return { ok: false, exitCode: 2, error: message }
}

export function buildQueryPlan(argv = []) {
  if (!Array.isArray(argv) || argv.length === 0) {
    return invalidQuery(`Query type is required. Expected one of: ${QUERY_TYPES.join(', ')}`)
  }

  const [type, ...rawArgs] = argv
  const repositoryArgs = ['--repo', getGitNexusRepositoryName()]
  if (!QUERY_TYPES.includes(type)) {
    return invalidQuery(`Unsupported graph query type: ${type}. Expected one of: ${QUERY_TYPES.join(', ')}`)
  }

  if (type === 'changes') {
    if (rawArgs.length > 1) return invalidQuery('changes accepts at most one base ref')
    if (rawArgs.length === 1) {
      return {
        ok: true,
        type,
        args: ['detect-changes', '--scope', 'compare', '--base-ref', rawArgs[0], ...repositoryArgs]
      }
    }
    return { ok: true, type, args: ['detect-changes', '--scope', 'unstaged', ...repositoryArgs] }
  }

  if (rawArgs.length === 0) {
    return invalidQuery(`${type} requires a target or query text`)
  }

  return {
    ok: true,
    type,
    args: [type, rawArgs.join(' '), ...repositoryArgs]
  }
}

export function runGraphQuery(
  argv = [],
  run = runGitNexus,
  io = { stdout: process.stdout, stderr: process.stderr }
) {
  const plan = buildQueryPlan(argv)
  if (!plan.ok) {
    io.stderr.write(`${plan.error}\n`)
    return plan.exitCode
  }

  const result = run(plan.args)
  writeCommandResult(result, io)
  return commandExitCode(result)
}

const currentFile = fileURLToPath(import.meta.url)
if (process.argv[1] && resolve(process.argv[1]) === currentFile) {
  process.exit(runGraphQuery(process.argv.slice(2)))
}
