import { spawn } from 'node:child_process'
import { describe, expect, it, beforeAll, afterAll } from 'vitest'

const port = 4327
let child

async function waitForHealth() {
  const deadline = Date.now() + 10_000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`)
      if (response.ok) return
    } catch {
      // The server is still starting.
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error('Control Plane security test server did not start')
}

describe('Control Plane HTTP security boundary', () => {
  beforeAll(async () => {
    child = spawn(process.execPath, ['scripts/control-plane/server.mjs'], {
      env: {
        ...process.env,
        HARNESS_CONTROL_PLANE_PORT: String(port),
        HARNESS_CONTROL_PLANE_TOKEN: 'integration-token',
        HARNESS_CONTROL_PLANE_ORIGINS: 'https://allowed.example',
      },
      stdio: 'ignore',
    })
    await waitForHealth()
  })

  afterAll(() => {
    if (child && !child.killed) child.kill()
  })

  it('protects API reads, allows health probes, and rejects disallowed origins', async () => {
    const health = await fetch(`http://127.0.0.1:${port}/health`)
    expect(health.status).toBe(200)
    await expect(health.json()).resolves.toMatchObject({ authRequired: true })

    const missing = await fetch(`http://127.0.0.1:${port}/overview`)
    expect(missing.status).toBe(401)

    const wrong = await fetch(`http://127.0.0.1:${port}/overview`, {
      headers: { authorization: 'Bearer wrong' },
    })
    expect(wrong.status).toBe(401)

    const allowed = await fetch(`http://127.0.0.1:${port}/overview`, {
      headers: { authorization: 'Bearer integration-token', origin: 'https://allowed.example' },
    })
    expect(allowed.status).toBe(200)
    expect(allowed.headers.get('access-control-allow-origin')).toBe('https://allowed.example')

    const forbiddenOrigin = await fetch(`http://127.0.0.1:${port}/overview`, {
      headers: { authorization: 'Bearer integration-token', origin: 'https://evil.example' },
    })
    expect(forbiddenOrigin.status).toBe(403)
  })

  it('rejects traversal-shaped task identifiers before a read or spawn', async () => {
    const response = await fetch(`http://127.0.0.1:${port}/tasks/%2e%2e%2Fsecrets/run`, {
      method: 'POST',
      headers: { authorization: 'Bearer integration-token' },
    })
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ error: 'INVALID_TASK_ID' })
  })
})
