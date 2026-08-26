import { describe, expect, it } from 'vitest'
import { isUnhealthyOutput, statusExitCode } from '../../scripts/graph/status.mjs'

describe('GitNexus status contract', () => {
  it('recognizes missing and stale graph state even when the CLI exits successfully', () => {
    expect(isUnhealthyOutput('Repository not indexed. Run: gitnexus analyze')).toBe(true)
    expect(isUnhealthyOutput('Graph is stale; run gitnexus analyze')).toBe(true)
    expect(statusExitCode({ status: 0, stdout: 'Repository not indexed.' })).toBe(1)
  })

  it('accepts a healthy status and rejects process failures', () => {
    expect(statusExitCode({ status: 0, stdout: 'Repository indexed and up to date.' })).toBe(0)
    expect(statusExitCode({ status: 2, stdout: '' })).toBe(2)
    expect(statusExitCode({ status: null, error: new Error('npx unavailable') })).toBe(1)
  })
})
