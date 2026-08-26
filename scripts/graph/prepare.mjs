import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)

export function resolveLadybugInstallScript() {
  const gitNexusRoot = dirname(require.resolve('gitnexus/package.json'))
  const ladybugRoot = dirname(require.resolve('@ladybugdb/core', { paths: [gitNexusRoot] }))
  return join(ladybugRoot, 'install.js')
}

export function runGraphPrepare(
  installScript = resolveLadybugInstallScript(),
  spawn = spawnSync
) {
  const result = spawn(process.execPath, [installScript], { stdio: 'inherit' })
  return result.status ?? 1
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  process.exit(runGraphPrepare())
}
