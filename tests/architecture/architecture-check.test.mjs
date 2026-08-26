import assert from 'node:assert/strict'
import { test } from 'node:test'
import { resolve } from 'node:path'
import { findBoundaryViolations } from '../../scripts/harness/architecture-check.mjs'

const rootDir = resolve(import.meta.dirname, '../..')

test('repository source currently satisfies documented dependency boundaries', () => {
  assert.deepEqual(findBoundaryViolations({ rootDir }), [])
})

test('domain to api imports are rejected by the boundary checker', () => {
  const fixture = resolve(rootDir, 'tests/architecture/fixtures/domain/invalid-import.mjs')
  const violations = findBoundaryViolations({ rootDir, files: [fixture] })

  assert.equal(violations.length, 1)
  assert.equal(violations[0].rule, 'domain-dependencies')
})
