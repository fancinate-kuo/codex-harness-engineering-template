import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const TASK_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/
const ACTOR_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 ._:@/-]{0,127}$/
const DEFAULT_MAX_BODY_BYTES = 64 * 1024

function securityError(message, code) {
  const error = new Error(message)
  error.code = code
  return error
}

export function isLoopbackHost(host) {
  return ['127.0.0.1', '::1', 'localhost'].includes(String(host).toLowerCase())
}

export function createControlPlaneSecurityConfig({
  host = '127.0.0.1',
  port = 4317,
  config = {},
  env = process.env,
} = {}) {
  const token = env.HARNESS_CONTROL_PLANE_TOKEN?.trim() || null
  if (!isLoopbackHost(host) && !token) {
    throw new Error('HARNESS_CONTROL_PLANE_TOKEN is required when binding outside loopback')
  }

  const configuredOrigins = env.HARNESS_CONTROL_PLANE_ORIGINS
    ? env.HARNESS_CONTROL_PLANE_ORIGINS.split(',').map(value => value.trim()).filter(Boolean)
    : config.security?.allowedOrigins
  const allowedOrigins = configuredOrigins?.length
    ? [...new Set(configuredOrigins)]
    : [`http://${host}:${port}`, 'http://127.0.0.1:4318', 'http://localhost:4318']
  const maxBodyBytes = Number(
    env.HARNESS_CONTROL_PLANE_MAX_BODY_BYTES ??
      config.security?.maxBodyBytes ??
      DEFAULT_MAX_BODY_BYTES,
  )
  if (!Number.isInteger(maxBodyBytes) || maxBodyBytes < 1024 || maxBodyBytes > 10 * 1024 * 1024) {
    throw new Error('Control Plane max body size must be between 1024 and 10485760 bytes')
  }

  return Object.freeze({
    token,
    requireAuth: Boolean(token),
    allowedOrigins,
    maxBodyBytes,
  })
}

export function isAuthorized(request, security) {
  if (!security.requireAuth) return true
  const actual = request.headers?.authorization
  if (typeof actual !== 'string' || !security.token) return false
  const expected = Buffer.from(`Bearer ${security.token}`)
  const received = Buffer.from(actual)
  return received.length === expected.length && crypto.timingSafeEqual(received, expected)
}

export function isAllowedOrigin(origin, security) {
  return !origin || security.allowedOrigins.includes(origin)
}

export function isJsonContentType(contentType) {
  return typeof contentType === 'string'
    && contentType.split(';', 1)[0].trim().toLowerCase() === 'application/json'
}

export function validateTaskId(value) {
  if (typeof value !== 'string' || !TASK_ID_PATTERN.test(value)) {
    throw securityError('Invalid task id', 'INVALID_TASK_ID')
  }
  return value
}

export function validateApprovalPayload(payload = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw securityError('Approval payload must be a JSON object', 'INVALID_JSON_BODY')
  }
  const decidedBy = payload.decidedBy ?? 'control-plane'
  const reason = payload.reason ?? ''
  if (typeof decidedBy !== 'string' || !ACTOR_PATTERN.test(decidedBy)) {
    throw securityError('Invalid approval actor', 'INVALID_APPROVAL_ACTOR')
  }
  const containsControlCharacter = typeof reason === 'string'
    && [...reason].some(character => character.charCodeAt(0) < 32)
  if (typeof reason !== 'string' || reason.length > 2_000 || containsControlCharacter) {
    throw securityError('Invalid approval reason', 'INVALID_APPROVAL_REASON')
  }
  return { decidedBy, reason }
}

export function parseJsonBodyText(text, { maxBytes = DEFAULT_MAX_BODY_BYTES } = {}) {
  const value = String(text ?? '')
  if (Buffer.byteLength(value, 'utf8') > maxBytes) {
    throw securityError('Request body is too large', 'BODY_TOO_LARGE')
  }
  if (!value.trim()) return {}
  let parsed
  try {
    parsed = JSON.parse(value)
  } catch {
    throw securityError('Request body must be valid JSON', 'INVALID_JSON_BODY')
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw securityError('Request body must be a JSON object', 'INVALID_JSON_BODY')
  }
  return parsed
}

export function parseJsonBody(request, { maxBytes = DEFAULT_MAX_BODY_BYTES } = {}) {
  return new Promise((resolve, reject) => {
    let data = ''
    let size = 0
    let settled = false
    const fail = error => {
      if (settled) return
      settled = true
      reject(error)
    }
    request.on('data', chunk => {
      const value = String(chunk)
      size += Buffer.byteLength(value, 'utf8')
      if (size > maxBytes) {
        fail(securityError('Request body is too large', 'BODY_TOO_LARGE'))
        return
      }
      data += value
    })
    request.on('error', error => fail(error))
    request.on('end', () => {
      if (settled) return
      try {
        const parsed = parseJsonBodyText(data, { maxBytes })
        settled = true
        resolve(parsed)
      } catch (error) {
        settled = true
        reject(error)
      }
    })
  })
}

export function actorFromRequest(request) {
  const actor = request.headers?.['x-control-plane-actor']
  return typeof actor === 'string' && ACTOR_PATTERN.test(actor) ? actor : 'control-plane-client'
}

export function appendMutationAudit({
  taskId,
  action,
  actor,
  metadata = {},
  auditFile = '.codex/observability/control-plane/audit.jsonl',
}) {
  const event = {
    at: new Date().toISOString(),
    taskId: validateTaskId(taskId),
    action,
    actor,
    metadata,
  }
  fs.mkdirSync(path.dirname(auditFile), { recursive: true })
  fs.appendFileSync(auditFile, `${JSON.stringify(event)}\n`, 'utf8')
  return event
}
