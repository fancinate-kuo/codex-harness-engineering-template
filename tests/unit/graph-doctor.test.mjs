import { describe, expect, it } from 'vitest'
import {
  classifyProviderHealth,
  hasOptionalFtsWarning,
  hasUnavailableGraphProvider,
  runGraphDoctor
} from '../../scripts/graph/doctor.mjs'

const healthyVersion = { status: 0, stdout: '1.6.9\n', stderr: '' }
const healthyStatus = { status: 0, stdout: 'Status: up to date\n', stderr: '' }
const healthyDoctor = { status: 0, stdout: 'Graph store: available\n', stderr: '' }

describe('GitNexus provider health', () => {
  it('accepts a fresh graph and treats optional FTS loss as a warning', () => {
    const result = classifyProviderHealth({
      versionResult: healthyVersion,
      statusResult: healthyStatus,
      doctorResult: {
        ...healthyDoctor,
        stderr: 'FTS extension unavailable; keyword search degraded\n'
      }
    })

    expect(result.ok).toBe(true)
    expect(result.failures).toEqual([])
    expect(result.warnings).toHaveLength(1)
    expect(result.checks.optionalFts).toBe(false)
    expect(hasOptionalFtsWarning(result.warnings.join('\n'))).toBe(true)
  })

  it.each([
    ['stale index', { ...healthyStatus, stdout: 'Status: stale\n' }],
    ['missing index', { ...healthyStatus, stdout: 'Repository not indexed\n' }],
    ['unavailable provider', healthyStatus]
  ])('rejects %s', (label, statusResult) => {
    const doctorResult = label === 'unavailable provider'
      ? { status: 0, stdout: 'Graph store: unavailable\n', stderr: '' }
      : healthyDoctor
    const result = classifyProviderHealth({
      versionResult: healthyVersion,
      statusResult,
      doctorResult
    })

    expect(result.ok, label).toBe(false)
    expect(result.failures.length, label).toBeGreaterThan(0)
  })

  it('rejects a version drift and a provider process failure', () => {
    expect(classifyProviderHealth({
      versionResult: { status: 0, stdout: '1.6.8\n', stderr: '' },
      statusResult: healthyStatus,
      doctorResult: healthyDoctor
    }).ok).toBe(false)

    expect(classifyProviderHealth({
      versionResult: healthyVersion,
      statusResult: healthyStatus,
      doctorResult: { status: null, error: new Error('spawn failed') }
    }).ok).toBe(false)
  })

  it('classifies graph provider failure independently of optional FTS', () => {
    expect(hasUnavailableGraphProvider('Graph provider: unavailable')).toBe(true)
    expect(hasUnavailableGraphProvider('Graph store: available')).toBe(false)
  })

  it('runs version, status, and doctor through the injected runner', () => {
    const calls = []
    const exitCode = runGraphDoctor(args => {
      calls.push(args)
      if (args[0] === '--version') return healthyVersion
      if (args[0] === 'status') return healthyStatus
      return healthyDoctor
    }, {
      stdout: { write() {} },
      stderr: { write() {} }
    })

    expect(exitCode).toBe(0)
    expect(calls).toEqual([['--version'], ['status'], ['doctor']])
  })
})
