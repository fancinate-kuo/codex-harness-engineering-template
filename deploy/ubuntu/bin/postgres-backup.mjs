import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import {
  isAbsolute as nativeIsAbsolute,
  join as nativeJoin,
  parse as nativeParse,
  relative as nativeRelative,
  resolve as nativeResolve,
  posix,
} from "node:path";
import { fileURLToPath } from "node:url";
import { spawn as defaultSpawn } from "node:child_process";
import {
  deploymentError,
  loadSecretEnvironment,
} from "./secret-runtime.mjs";

export const DEFAULT_BACKUP_DIRECTORY = "/var/lib/harness/backups";

function deploymentPathApi(value) {
  return typeof value === "string" && value.startsWith("/")
    ? posix
    : { isAbsolute: nativeIsAbsolute, join: nativeJoin, parse: nativeParse, relative: nativeRelative, resolve: nativeResolve };
}

function decodePart(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    throw deploymentError("INVALID_DATABASE_URL", "Database URL contains invalid encoding");
  }
}

export function parseDatabaseConnection(value) {
  if (!value || typeof value !== "string") {
    throw deploymentError("INVALID_DATABASE_URL", "Database URL is required");
  }

  let url;
  try {
    url = new URL(value.trim());
  } catch {
    throw deploymentError("INVALID_DATABASE_URL", "Database URL is invalid");
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.username || !url.pathname.slice(1)) {
    throw deploymentError("INVALID_DATABASE_URL", "Database URL must identify a PostgreSQL database");
  }

  return Object.freeze({
    host: url.hostname,
    port: url.port || "5432",
    user: decodePart(url.username),
    password: decodePart(url.password),
    database: decodePart(url.pathname.slice(1)),
    sslmode: url.searchParams.get("sslmode") || undefined,
  });
}

function pgpassField(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll(":", "\\:");
}

export function buildPostgresEnvironment(connection, passFile, baseEnvironment = process.env) {
  return Object.freeze({
    ...baseEnvironment,
    PGHOST: connection.host,
    PGPORT: connection.port,
    PGUSER: connection.user,
    PGDATABASE: connection.database,
    PGPASSFILE: passFile,
    ...(connection.sslmode ? { PGSSLMODE: connection.sslmode } : {}),
  });
}

export function isPathWithin(root, target) {
  const pathApi = deploymentPathApi(root);
  const rootPath = pathApi.resolve(root);
  const targetPath = pathApi.resolve(target);
  const difference = pathApi.relative(rootPath, targetPath);
  return difference === "" || (!difference.startsWith("..") && !pathApi.isAbsolute(difference));
}

export function assertSafeBackupDirectory(directory = DEFAULT_BACKUP_DIRECTORY) {
  const pathApi = deploymentPathApi(directory);
  if (!pathApi.isAbsolute(directory)) {
    throw deploymentError("INVALID_BACKUP_DIRECTORY", "Backup directory must be absolute");
  }
  const resolved = pathApi.resolve(directory);
  if (resolved === pathApi.parse(resolved).root) {
    throw deploymentError("INVALID_BACKUP_DIRECTORY", "Backup directory cannot be the filesystem root");
  }
  return resolved;
}

export function backupFilePath(directory, timestamp = new Date()) {
  const root = assertSafeBackupDirectory(directory);
  const pathApi = deploymentPathApi(root);
  const stamp = timestamp.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  return pathApi.join(root, `harness-${stamp}.dump`);
}

export function createPgpassContent(connection) {
  const host = connection.host.includes(":") ? `[${connection.host}]` : connection.host;
  return `${pgpassField(host)}:${pgpassField(connection.port)}:${pgpassField(connection.database)}:${pgpassField(connection.user)}:${pgpassField(connection.password)}\n`;
}

export function sha256File(filePath, { createReadStreamImpl = createReadStream } = {}) {
  return new Promise((resolveHash, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStreamImpl(filePath);
    stream.on("data", chunk => hash.update(chunk));
    stream.on("error", () => reject(deploymentError("BACKUP_READ_FAILED", "Backup could not be read")));
    stream.on("end", () => resolveHash(hash.digest("hex")));
  });
}

function runExternal(program, args, { environment, spawnFile = defaultSpawn } = {}) {
  return new Promise((resolveProcess, reject) => {
    const child = spawnFile(program, args, {
      env: environment,
      shell: false,
      stdio: "ignore",
    });
    child.on("error", () => reject(deploymentError("DATABASE_COMMAND_FAILED", "Database command failed")));
    child.on("close", code => {
      if (code !== 0) {
        reject(deploymentError("DATABASE_COMMAND_FAILED", "Database command failed"));
        return;
      }
      resolveProcess();
    });
  });
}

async function resolveDatabaseEnvironment(environment, options) {
  if (environment.HARNESS_DATABASE_URL?.trim()) return environment;
  if (!environment.HARNESS_DATABASE_SECRETS_FILE) {
    throw deploymentError("MISSING_DATABASE_SECRET", "Database secret file is required");
  }
  return loadSecretEnvironment({
    inputPath: environment.HARNESS_DATABASE_SECRETS_FILE,
    required: ["HARNESS_DATABASE_URL"],
    allowed: ["HARNESS_DATABASE_URL"],
    environment,
    sopsBinary: options.sopsBinary,
    spawnFile: options.spawnFile,
  });
}

async function createPgpassFile(connection, directory = tmpdir()) {
  const passFile = deploymentPathApi(directory).join(directory, `harness-pgpass-${randomUUID()}`);
  await fs.writeFile(passFile, createPgpassContent(connection), { encoding: "utf8", mode: 0o600 });
  await fs.chmod(passFile, 0o600);
  return passFile;
}

export async function verifyBackup(backupPath, {
  backupDirectory = DEFAULT_BACKUP_DIRECTORY,
  readFile = fs.readFile,
  hashFile = sha256File,
} = {}) {
  const root = assertSafeBackupDirectory(backupDirectory);
  const resolved = deploymentPathApi(root).resolve(backupPath);
  if (!isPathWithin(root, resolved) || !resolved.endsWith(".dump")) {
    throw deploymentError("INVALID_BACKUP_PATH", "Backup path is outside the backup directory");
  }

  const checksumPath = `${resolved}.sha256`;
  let checksumText;
  try {
    checksumText = await readFile(checksumPath, "utf8");
  } catch {
    throw deploymentError("BACKUP_CHECKSUM_MISSING", "Backup checksum is missing");
  }
  const expected = checksumText.trim().split(/\s+/)[0];
  if (!/^[a-f0-9]{64}$/.test(expected)) {
    throw deploymentError("BACKUP_CHECKSUM_INVALID", "Backup checksum is invalid");
  }
  const actual = await hashFile(resolved);
  if (actual !== expected) {
    throw deploymentError("BACKUP_CHECKSUM_MISMATCH", "Backup checksum does not match");
  }
  return Object.freeze({ backupPath: resolved, checksumPath, checksum: actual });
}

export async function backupDatabase({
  environment = process.env,
  now = new Date(),
  backupDirectory = environment.HARNESS_BACKUP_DIR || DEFAULT_BACKUP_DIRECTORY,
  spawnFile = defaultSpawn,
  sopsBinary,
  tempDirectory = tmpdir(),
} = {}) {
  const resolvedEnvironment = await resolveDatabaseEnvironment(environment, { sopsBinary, spawnFile });
  const connection = parseDatabaseConnection(resolvedEnvironment.HARNESS_DATABASE_URL);
  const root = assertSafeBackupDirectory(backupDirectory);
  await fs.mkdir(root, { recursive: true, mode: 0o750 });
  const outputPath = backupFilePath(root, now);
  const partialPath = `${outputPath}.partial-${randomUUID()}`;
  const passFile = await createPgpassFile(connection, tempDirectory);
  try {
    await runExternal("pg_dump", [
      "--format=custom",
      "--no-owner",
      "--no-acl",
      "--file",
      partialPath,
    ], { environment: buildPostgresEnvironment(connection, passFile, resolvedEnvironment), spawnFile });
    await fs.rename(partialPath, outputPath);
    const checksum = await sha256File(outputPath);
    const checksumPath = `${outputPath}.sha256`;
    await fs.writeFile(checksumPath, `${checksum}  ${outputPath.split(/[\\/]/).pop()}\n`, { encoding: "utf8", mode: 0o640 });
    const stats = await fs.stat(outputPath);
    return Object.freeze({ backupPath: outputPath, checksumPath, checksum, bytes: stats.size });
  } finally {
    await fs.rm(partialPath, { force: true });
    await fs.rm(passFile, { force: true });
  }
}

export async function restoreDatabase({
  backupPath,
  environment = process.env,
  backupDirectory = environment.HARNESS_BACKUP_DIR || DEFAULT_BACKUP_DIRECTORY,
  confirm = false,
  spawnFile = defaultSpawn,
  sopsBinary,
  tempDirectory = tmpdir(),
} = {}) {
  if (!confirm || environment.HARNESS_RESTORE_CONFIRM !== "YES") {
    throw deploymentError("RESTORE_CONFIRMATION_REQUIRED", "Restore requires explicit confirmation");
  }
  const verified = await verifyBackup(backupPath, { backupDirectory });
  const resolvedEnvironment = await resolveDatabaseEnvironment(environment, { sopsBinary, spawnFile });
  const connection = parseDatabaseConnection(resolvedEnvironment.HARNESS_DATABASE_URL);
  const passFile = await createPgpassFile(connection, tempDirectory);
  try {
    await runExternal("pg_restore", [
      "--clean",
      "--if-exists",
      "--exit-on-error",
      "--single-transaction",
      "--no-owner",
      "--no-acl",
      "--dbname",
      connection.database,
      verified.backupPath,
    ], { environment: buildPostgresEnvironment(connection, passFile, resolvedEnvironment), spawnFile });
    return Object.freeze({ restoredFrom: verified.backupPath });
  } finally {
    await fs.rm(passFile, { force: true });
  }
}

function cliArguments(argumentsList) {
  const [action, ...rest] = argumentsList;
  if (action === "backup") return { action };
  if (action === "restore") {
    const backupPath = rest.find(value => value !== "--confirm");
    return { action, backupPath, confirm: rest.includes("--confirm") };
  }
  throw deploymentError("INVALID_BACKUP_COMMAND", "Expected backup or restore");
}

const currentFile = nativeResolve(fileURLToPath(import.meta.url));
if (process.argv[1] && nativeResolve(process.argv[1]) === currentFile) {
  try {
    const args = cliArguments(process.argv.slice(2));
    const result = args.action === "backup"
      ? await backupDatabase()
      : await restoreDatabase(args);
    console.log(JSON.stringify({ ok: true, ...result }));
  } catch (error) {
    console.error(JSON.stringify({
      type: "deployment.database_backup_error",
      error: error.code || "DATABASE_BACKUP_FAILED",
    }));
    process.exitCode = 1;
  }
}
