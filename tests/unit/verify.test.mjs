import { describe, expect, it } from 'vitest'
import { REQUIRED_GATES, shouldRejectGraphSkip } from '../../scripts/harness/verify.mjs'

describe('harness verification contract', () => {
  it('includes every required delivery gate', () => {
    expect(REQUIRED_GATES.map(([name]) => name)).toEqual([
      'lint',
      'typecheck',
      'unit',
      'integration',
      'architecture',
      'control-build',
      'e2e',
      'repo-map',
      'business-graph',
      'memory'
    ])
  })

  it('rejects graph bypass in CI but allows local bootstrap', () => {
    expect(shouldRejectGraphSkip({ CI: 'true', HARNESS_SKIP_GRAPH: '1' })).toBe(true)
    expect(shouldRejectGraphSkip({ CI: '1', HARNESS_SKIP_GRAPH: '1' })).toBe(true)
    expect(shouldRejectGraphSkip({ CI: 'false', HARNESS_SKIP_GRAPH: '1' })).toBe(false)
    expect(shouldRejectGraphSkip({ HARNESS_SKIP_GRAPH: '1' })).toBe(false)
  })
})
