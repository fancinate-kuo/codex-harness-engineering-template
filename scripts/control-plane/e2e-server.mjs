import { spawn } from 'node:child_process'

const rootDir = process.cwd()
const children = []

function start(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: false,
    ...options
  })
  children.push(child)
  return child
}

async function waitForHealth(url, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs
  let lastError = null

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch (error) {
      lastError = error
    }
    await new Promise(resolve => setTimeout(resolve, 250))
  }

  throw new Error(`Timed out waiting for ${url}: ${lastError?.message ?? 'no response'}`)
}

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) child.kill()
  }
  process.exitCode = code
}

process.on('SIGINT', () => shutdown(130))
process.on('SIGTERM', () => shutdown(143))

const api = start(process.execPath, ['scripts/control-plane/server.mjs'])
api.on('exit', code => {
  if (code && code !== 0) shutdown(code)
})

try {
  await waitForHealth('http://127.0.0.1:4317/health')
  const web = start(
    process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : 'pnpm',
    process.platform === 'win32'
      ? ['/d', '/s', '/c', 'pnpm --dir apps/control-plane dev']
      : ['--dir', 'apps/control-plane', 'dev']
  )
  web.on('exit', code => shutdown(code ?? 0))
} catch (error) {
  console.error(error.message)
  shutdown(1)
}
