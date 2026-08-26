import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  PINNED_GITNEXUS_VERSION,
  commandExitCode,
  commandOutput,
  runGitNexus,
  writeCommandResult
} from './command.mjs'
import { isUnhealthyOutput, statusExitCode } from './status.mjs'

const FTS_WARNING_PATTERNS = [
  /full[- ]text(?: search)?\s*[:=-]\s*(?:unavailable|missing|disabled|not available)/i,
  /full[- ]text(?: search)?.*(?:unavailable|missing|disabled|not available)/i,
  /fts(?: extension| indexes?)?.*(?:unavailable|missing|disabled|not available)/i,
  /keyword search degraded/i
]

const GRAPH_FAILURE_PATTERNS = [
  /graph (?:store|provider)?\s*[:=-]\s*(?:unavailable|missing|disabled|failed|error|not available)/i,
  /(?:graph store|graph provider).*(?:unavailable|missing|disabled|failed|error|not available)/i
]

export function hasOptionalFtsWarning(output) {
  return FTS_WARNING_PATTERNS.some(pattern => pattern.test(output))
}

export function hasUnavailableGraphProvider(output) {
  return GRAPH_FAILURE_PATTERNS.some(pattern => pattern.test(output))
}

export function classifyProviderHealth({
  versionResult,
  statusResult,
  doctorResult,
  expectedVersion = PINNED_GITNEXUS_VERSION
}) {
  const failures = []
  const warnings = []
  const versionOutput = commandOutput(versionResult)
  const statusOutput = commandOutput(statusResult)
  const doctorOutput = commandOutput(doctorResult)
  const combinedOutput = `${versionOutput}\n${statusOutput}\n${doctorOutput}`

  if (commandExitCode(versionResult) !== 0) {
    failures.push('GitNexus version command failed')
  } else if (!versionOutput.includes(expectedVersion)) {
    failures.push(`GitNexus ${expectedVersion} is required`)
  }

  const graphStatusCode = statusExitCode(statusResult)
  if (graphStatusCode !== 0 || isUnhealthyOutput(statusOutput)) {
    failures.push('GitNexus index is missing, stale, or unavailable')
  }

  const graphProviderAvailable = /graph (?:store|provider)\s*:\s*available/i.test(doctorOutput)
  if (hasUnavailableGraphProvider(combinedOutput)) {
    failures.push('GitNexus graph provider is unavailable')
  } else if (!graphProviderAvailable) {
    failures.push('GitNexus doctor did not report an available graph provider')
  }

  if (hasOptionalFtsWarning(combinedOutput)) {
    warnings.push('GitNexus full-text search is unavailable; keyword search is degraded')
  }

  const doctorExitCode = commandExitCode(doctorResult)
  if (doctorExitCode !== 0 && graphProviderAvailable && warnings.length === 0) {
    failures.push('GitNexus doctor command failed')
  }

  return {
    ok: failures.length === 0,
    status: failures.length === 0 ? 'healthy' : 'unhealthy',
    expectedVersion,
    failures,
    warnings,
    checks: {
      version: commandExitCode(versionResult) === 0 && versionOutput.includes(expectedVersion),
      index: graphStatusCode === 0 && !isUnhealthyOutput(statusOutput),
      graphProvider: graphProviderAvailable && !hasUnavailableGraphProvider(combinedOutput),
      optionalFts: !hasOptionalFtsWarning(combinedOutput)
    }
  }
}

export function runGraphDoctor(
  run = runGitNexus,
  io = { stdout: process.stdout, stderr: process.stderr }
) {
  const versionResult = run(['--version'])
  const statusResult = run(['status'])
  const doctorResult = run(['doctor'])

  for (const result of [versionResult, statusResult, doctorResult]) {
    writeCommandResult(result, io)
  }

  const health = classifyProviderHealth({ versionResult, statusResult, doctorResult })
  for (const warning of health.warnings) io.stderr.write(`Warning: ${warning}\n`)
  for (const failure of health.failures) io.stderr.write(`Error: ${failure}\n`)
  return health.ok ? 0 : 1
}

const currentFile = fileURLToPath(import.meta.url)
if (process.argv[1] && resolve(process.argv[1]) === currentFile) {
  console.log('== GitNexus Provider Health ==')
  process.exit(runGraphDoctor())
}
