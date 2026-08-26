import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const rootDir = resolve(import.meta.dirname, '../..')

function runScript(script) {
  return execFileSync(process.execPath, [resolve(rootDir, script)], {
    cwd: rootDir,
    encoding: 'utf8'
  })
}

describe('repository integrity gates', () => {
  it('validates the repository map', () => {
    expect(runScript('scripts/harness/repo-map.mjs')).toContain('Repo map OK.')
  })

  it('validates the business graph and memory index', () => {
    expect(runScript('scripts/graph/business-validate.mjs')).toContain('Business Graph validation PASS')
    expect(runScript('scripts/memory/validate.mjs')).toContain('Memory validation PASS')
  })
})
