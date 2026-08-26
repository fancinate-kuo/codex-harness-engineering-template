export async function getJson<T>(path: string): Promise<T> {
  const r = await fetch(`/api${path}`)
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
  return r.json()
}

export async function postJson<T>(path: string, body: unknown = {}): Promise<T> {
  const r = await fetch(`/api${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
  return r.json()
}
