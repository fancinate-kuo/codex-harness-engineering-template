import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  buildGitNexusCommand,
  getPnpmExecutable,
  PINNED_GITNEXUS_VERSION
} from '../../scripts/graph/command.mjs'
import { buildAnalyzeArgs } from '../../scripts/graph/analyze.mjs'
import { buildQueryPlan, runGraphQuery } from '../../scripts/graph/query.mjs'

function captureIo() {
  let stdout = ''
  let stderr = ''
  return {
    io: {
      stdout: { write: value => { stdout += value } },
      stderr: { write: value => { stderr += value } }
    },
    read: () => ({ stdout, stderr })
  }
}

describe('GitNexus command contract', () => {
  it('uses the pinned pnpm exec form on both supported platforms', () => {
    expect(PINNED_GITNEXUS_VERSION).toBe('1.6.9')
    expect(getPnpmExecutable('win32')).toBe('pnpm.cmd')
    expect(getPnpmExecutable('linux')).toBe('pnpm')
    expect(buildGitNexusCommand(['status'])).toEqual(['exec', 'gitnexus', 'status'])
  })

  it('always performs analyze in index-only mode', () => {
    expect(buildAnalyzeArgs()).toEqual(['analyze', '--index-only'])
    expect(buildAnalyzeArgs(['--force'])).toEqual(['analyze', '--index-only', '--force'])
    expect(buildAnalyzeArgs(['--index-only'])).toEqual(['analyze', '--index-only'])
  })
})

describe('GitNexus query routing', () => {
  it.each([
    [['context', 'runGraphStatus'], ['context', 'runGraphStatus', '--repo', 'codex-harness-engineering-template']],
    [['impact', 'runGraphStatus'], ['impact', 'runGraphStatus', '--repo', 'codex-harness-engineering-template']],
    [['query', 'graph status'], ['query', 'graph status', '--repo', 'codex-harness-engineering-template']],
    [['cypher', 'MATCH (n) RETURN n'], ['cypher', 'MATCH (n) RETURN n', '--repo', 'codex-harness-engineering-template']],
    [['changes'], ['detect-changes', '--scope', 'unstaged', '--repo', 'codex-harness-engineering-template']],
    [['changes', 'main'], ['detect-changes', '--scope', 'compare', '--base-ref', 'main', '--repo', 'codex-harness-engineering-template']]
  ])('routes %j to the GitNexus CLI contract', (argv, expectedArgs) => {
    expect(buildQueryPlan(argv)).toMatchObject({ ok: true, args: expectedArgs })
  })

  it('rejects missing, unknown, and over-specified arguments without invoking the runner', () => {
    expect(buildQueryPlan([])).toMatchObject({ ok: false, exitCode: 2 })
    expect(buildQueryPlan(['unknown', 'target'])).toMatchObject({ ok: false, exitCode: 2 })
    expect(buildQueryPlan(['context'])).toMatchObject({ ok: false, exitCode: 2 })
    expect(buildQueryPlan(['changes', 'main', 'extra'])).toMatchObject({ ok: false, exitCode: 2 })
  })

  it('propagates the GitNexus exit code and emits real runner output', () => {
    const capture = captureIo()
    let receivedArgs
    const exitCode = runGraphQuery(
      ['context', 'runGraphStatus'],
      args => {
        receivedArgs = args
        return { status: 17, stdout: '{"status":"found"}\n', stderr: '' }
      },
      capture.io
    )

    expect(receivedArgs).toEqual(['context', 'runGraphStatus', '--repo', 'codex-harness-engineering-template'])
    expect(exitCode).toBe(17)
    expect(capture.read().stdout).toContain('"status":"found"')
    expect(capture.read().stdout.toLowerCase()).not.toContain('placeholder')
  })

  it('does not leave placeholder implementations in graph entrypoints', () => {
    for (const file of ['build.mjs', 'query.mjs', 'analyze.mjs', 'status.mjs', 'gitnexus.mjs']) {
      const source = readFileSync(new URL(`../../scripts/graph/${file}`, import.meta.url), 'utf8')
      expect(source.toLowerCase()).not.toContain('placeholder')
    }
  })
})
