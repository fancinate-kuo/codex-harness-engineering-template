import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SOURCE_EXTENSIONS = new Set(['.js', '.cjs', '.mjs', '.ts', '.tsx', '.vue'])
const SOURCE_ROOTS = ['apps', 'packages']

function normalizePath(value) {
  return value.replaceAll('\\', '/').replace(/^\.\//, '')
}

function pathParts(value) {
  return normalizePath(value).split('/').filter(Boolean)
}

function layerForPath(value) {
  const parts = pathParts(value)

  if (parts.includes('domain')) return 'domain'
  if (parts.includes('infrastructure')) return 'infrastructure'
  if (parts.includes('application')) return 'application'
  if (parts.includes('api')) return 'api'
  if (parts.includes('web')) return 'web'
  if (parts.includes('page')) return 'web-page'
  if (parts.includes('features')) return 'web-feature'
  if (parts.includes('shared')) return 'web-shared'
  return null
}

function moduleNameForPath(value) {
  const parts = pathParts(value)
  const moduleIndex = parts.indexOf('modules')
  return moduleIndex >= 0 ? parts[moduleIndex + 1] ?? null : null
}

function featureNameForPath(value) {
  const parts = pathParts(value)
  const featureIndex = parts.indexOf('features')
  return featureIndex >= 0 ? parts[featureIndex + 1] ?? null : null
}

function extractImports(source) {
  const imports = []
  const patterns = [
    /\bimport\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g,
    /\bexport\s+[\s\S]*?\s+from\s+["']([^"']+)["']/g,
    /\b(?:import|require)\(\s*["']([^"']+)["']\s*\)/g
  ]

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) imports.push(match[1])
  }

  return [...new Set(imports)]
}

function resolveImportPath(sourcePath, importSpecifier, rootDir) {
  if (!importSpecifier.startsWith('.')) return importSpecifier

  const absolutePath = resolve(dirname(sourcePath), importSpecifier)
  const candidates = [
    absolutePath,
    ...[...SOURCE_EXTENSIONS].map(extension => `${absolutePath}${extension}`),
    ...[...SOURCE_EXTENSIONS].map(extension => join(absolutePath, `index${extension}`))
  ]
  const existing = candidates.find(candidate => existsSync(candidate))
  return normalizePath(relative(rootDir, existing ?? absolutePath))
}

function checkImport({ sourcePath, importSpecifier, rootDir }) {
  const sourceRelativePath = normalizePath(relative(rootDir, sourcePath))
  const targetPath = resolveImportPath(sourcePath, importSpecifier, rootDir)
  const targetParts = pathParts(targetPath)
  const targetLayer = layerForPath(targetPath)
  const sourceLayer = layerForPath(sourceRelativePath)
  const violations = []

  if (sourceLayer === 'domain' && ['infrastructure', 'api', 'web', 'web-page', 'web-feature'].includes(targetLayer)) {
    violations.push({
      rule: 'domain-dependencies',
      message: 'domain code must not depend on infrastructure, api, or web code'
    })
  }

  const sourceModule = moduleNameForPath(sourceRelativePath)
  const targetModule = moduleNameForPath(targetPath)
  const targetIsPrivatePersistence = targetParts.some(part => ['database', 'persistence', 'repository'].includes(part))
  if (sourceModule && targetModule && sourceModule !== targetModule && targetIsPrivatePersistence) {
    violations.push({
      rule: 'module-private-persistence',
      message: 'a module must not depend on another module private persistence implementation'
    })
  }

  const sourceFeature = featureNameForPath(sourceRelativePath)
  const targetFeature = featureNameForPath(targetPath)
  const targetIsPublicFeatureEntry = targetParts.includes('public') || basename(targetPath).startsWith('index.')
  if (sourceFeature && targetFeature && sourceFeature !== targetFeature && !targetIsPublicFeatureEntry) {
    violations.push({
      rule: 'feature-private-internals',
      message: 'a web feature must use another feature public contract instead of private internals'
    })
  }

  return violations.map(violation => ({
    ...violation,
    sourcePath: sourceRelativePath,
    importSpecifier,
    targetPath
  }))
}

function collectSourceFiles(rootDir) {
  const files = []
  const visit = directory => {
    if (!existsSync(directory)) return
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'coverage') continue
      const entryPath = join(directory, entry.name)
      if (entry.isDirectory()) visit(entryPath)
      else if (SOURCE_EXTENSIONS.has(extname(entry.name))) files.push(entryPath)
    }
  }

  for (const sourceRoot of SOURCE_ROOTS) visit(join(rootDir, sourceRoot))
  return files.sort()
}

export function findBoundaryViolations({ rootDir, files = collectSourceFiles(rootDir) }) {
  const violations = []
  for (const sourcePath of files) {
    const source = readFileSync(sourcePath, 'utf8')
    for (const importSpecifier of extractImports(source)) {
      violations.push(...checkImport({ sourcePath, importSpecifier, rootDir }))
    }
  }
  return violations
}

export function formatViolations(violations) {
  return violations
    .map(violation => `${violation.sourcePath} -> ${violation.importSpecifier} [${violation.rule}]: ${violation.message}`)
    .join('\n')
}

export function runArchitectureCheck(rootDir) {
  const files = collectSourceFiles(rootDir)
  const violations = findBoundaryViolations({ rootDir, files })
  if (violations.length > 0) {
    console.error(`Architecture boundary violations (${violations.length}):`)
    console.error(formatViolations(violations))
    return 1
  }

  console.log(`Architecture check passed (${files.length} source files scanned).`)
  return 0
}

const currentFile = fileURLToPath(import.meta.url)
if (process.argv[1] && resolve(process.argv[1]) === currentFile) {
  process.exit(runArchitectureCheck(resolve(process.cwd())))
}
