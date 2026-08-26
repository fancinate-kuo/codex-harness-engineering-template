import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  actorFromRequest,
  appendMutationAudit,
  createControlPlaneSecurityConfig,
  isAllowedOrigin,
  isAuthorized,
  isJsonContentType,
  parseJsonBodyText,
  validateApprovalPayload,
  validateTaskId,
} from '../../scripts/control-plane/lib/security.mjs'

describe('Control Plane security contract', () => {
  it('requires a token for non-loopback binding and validates bearer tokens', () => {
    expect(() => createControlPlaneSecurityConfig({ host: '0.0.0.0', env: {} }))
      .toThrow('HARNESS_CONTROL_PLANE_TOKEN')

    const security = createControlPlaneSecurityConfig({
      host: '0.0.0.0',
      env: {
        HARNESS_CONTROL_PLANE_TOKEN: 'test-token',
        HARNESS_CONTROL_PLANE_ORIGINS: 'https://control.example, https://admin.example',
      },
    })
    expect(isAuthorized({ headers: { authorization: 'Bearer test-token' } }, security)).toBe(true)
    expect(isAuthorized({ headers: { authorization: 'Bearer wrong' } }, security)).toBe(false)
    expect(isAllowedOrigin('https://control.example', security)).toBe(true)
    expect(isAllowedOrigin('https://evil.example', security)).toBe(false)
  })

  it('rejects malformed task, approval, and request bodies', () => {
    expect(validateTaskId('TASK-001')).toBe('TASK-001')
    expect(() => validateTaskId('../secrets')).toThrow('Invalid task id')
    expect(validateApprovalPayload({ decidedBy: 'reviewer', reason: 'approved' }))
      .toEqual({ decidedBy: 'reviewer', reason: 'approved' })
    expect(() => validateApprovalPayload({ decidedBy: 'bad\u0000actor' }))
      .toThrow('Invalid approval actor')
    expect(() => parseJsonBodyText('{"ok":true}')).not.toThrow()
    expect(() => parseJsonBodyText('{not-json}')).toThrow('valid JSON')
    expect(() => parseJsonBodyText('x'.repeat(2_000), { maxBytes: 1_024 }))
      .toThrow('too large')
  })

  it('accepts only JSON content types for mutation payloads', () => {
    expect(isJsonContentType('application/json')).toBe(true)
    expect(isJsonContentType('application/json; charset=utf-8')).toBe(true)
    expect(isJsonContentType('text/plain')).toBe(false)
    expect(isJsonContentType(undefined)).toBe(false)
  })

  it('writes mutation audit records without request credentials', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'control-plane-security-'))
    const file = path.join(dir, 'audit.jsonl')
    const event = appendMutationAudit({
      taskId: 'TASK-001',
      action: 'run-requested',
      actor: actorFromRequest({ headers: {} }),
      metadata: { method: 'POST', path: '/tasks/TASK-001/run' },
      auditFile: file,
    })
    expect(event).toMatchObject({ taskId: 'TASK-001', action: 'run-requested' })
    expect(fs.readFileSync(file, 'utf8')).not.toContain('authorization')
  })
})
