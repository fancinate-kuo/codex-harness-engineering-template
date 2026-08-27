import { spawn } from 'node:child_process'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const port = 4337
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
  throw new Error('Sora integration test server did not start')
}

function api(path, options = {}) {
  return fetch(`http://127.0.0.1:${port}${path}`, {
    ...options,
    headers: {
      authorization: 'Bearer integration-token',
      origin: 'https://allowed.example',
      ...(options.headers ?? {}),
    },
  })
}

describe('Sora article browsing API', () => {
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

  it('protects the route with the existing Control Plane auth boundary', async () => {
    await expect(fetch(`http://127.0.0.1:${port}/forum/articles`)).resolves.toHaveProperty('status', 401)
    const response = await api('/forum/articles')
    expect(response.status).toBe(200)
    expect(response.headers.get('access-control-allow-origin')).toBe('https://allowed.example')
  })

  it('supports category/search filtering and full article detail', async () => {
    const category = await api('/forum/articles?category=design')
    await expect(category.json()).resolves.toMatchObject({
      total: 1,
      articles: [{ slug: 'space-to-breathe' }],
    })

    const search = await api('/forum/articles?q=%E7%95%99%E7%99%BD')
    await expect(search.json()).resolves.toMatchObject({
      total: 1,
      articles: [{ slug: 'space-to-breathe' }],
    })

    const detail = await api('/forum/articles/space-to-breathe')
    expect(detail.status).toBe(200)
    await expect(detail.json()).resolves.toMatchObject({
      article: {
        slug: 'space-to-breathe',
        content: expect.any(Array),
      },
    })
  })

  it('returns useful client errors for invalid queries and missing articles', async () => {
    const invalidQuery = await api('/forum/articles?category=unknown')
    expect(invalidQuery.status).toBe(400)
    await expect(invalidQuery.json()).resolves.toMatchObject({ error: 'INVALID_FORUM_QUERY' })

    const missing = await api('/forum/articles/missing-article')
    expect(missing.status).toBe(404)
    await expect(missing.json()).resolves.toMatchObject({ error: 'article_not_found' })

    const invalidSlug = await api('/forum/articles/%2e%2e%2Fsecrets')
    expect(invalidSlug.status).toBe(400)
    await expect(invalidSlug.json()).resolves.toMatchObject({ error: 'INVALID_ARTICLE_SLUG' })
  })
})
