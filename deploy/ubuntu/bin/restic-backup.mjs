import { fileURLToPath } from "node:url";
import {
  isAbsolute as nativeIsAbsolute,
  parse as nativeParse,
  resolve as nativeResolve,
  posix,
} from "node:path";
import { spawn as defaultSpawn } from "node:child_process";
import {
  RESTIC_SECRET_KEYS,
  deploymentError,
  loadSecretEnvironment,
} from "./secret-runtime.mjs";

export const DEFAULT_BACKUP_PATH = "/var/lib/harness/backups";
export const DEFAULT_AUDIT_PATH = "/var/lib/harness/audit";

function deploymentPathApi(value) {
  return typeof value === "string" && value.startsWith("/")
    ? posix
    : { isAbsolute: nativeIsAbsolute, parse: nativeParse, resolve: nativeResolve };
}

export function assertSafeDataPath(value, name = "path") {
  const pathApi = deploymentPathApi(value);
  if (!value || !pathApi.isAbsolute(value)) {
    throw deploymentError("INVALID_RESTIC_PATH", `${name} must be absolute`);
  }
  const resolved = pathApi.resolve(value);
  if (resolved === pathApi.parse(resolved).root) {
    throw deploymentError("INVALID_RESTIC_PATH", `${name} cannot be the filesystem root`);
  }
  return resolved;
}

export function validateSnapshotName(snapshot) {
  if (!snapshot || !/^(latest|[A-Za-z0-9][A-Za-z0-9._-]{0,127})$/.test(snapshot)) {
    throw deploymentError("INVALID_RESTIC_SNAPSHOT", "Snapshot name is invalid");
  }
  return snapshot;
}

export function buildResticBackupArgs({
  backupPath = DEFAULT_BACKUP_PATH,
  auditPath = DEFAULT_AUDIT_PATH,
} = {}) {
  return [
    "backup",
    assertSafeDataPath(backupPath, "backup path"),
    assertSafeDataPath(auditPath, "audit path"),
    "--tag",
    "harness-control-plane",
  ];
}

export function buildResticRestoreArgs(snapshot, target) {
  return [
    "restore",
    validateSnapshotName(snapshot),
    "--target",
    assertSafeDataPath(target, "restore target"),
  ];
}

function runRestic(args, { environment, resticBinary = "restic", spawnFile = defaultSpawn } = {}) {
  return new Promise((resolveProcess, reject) => {
    const child = spawnFile(resticBinary, args, {
      env: environment,
      shell: false,
      stdio: "ignore",
    });
    child.on("error", () => reject(deploymentError("RESTIC_COMMAND_FAILED", "Restic command failed")));
    child.on("close", code => {
      if (code !== 0) {
        reject(deploymentError("RESTIC_COMMAND_FAILED", "Restic command failed"));
        return;
      }
      resolveProcess();
    });
  });
}

async function resolveResticEnvironment(environment, options) {
  if (environment.RESTIC_REPOSITORY && environment.RESTIC_PASSWORD) return environment;
  if (!environment.HARNESS_RESTIC_SECRETS_FILE) {
    throw deploymentError("MISSING_RESTIC_SECRET", "Restic secret file is required");
  }
  return loadSecretEnvironment({
    inputPath: environment.HARNESS_RESTIC_SECRETS_FILE,
    required: RESTIC_SECRET_KEYS,
    allowed: RESTIC_SECRET_KEYS,
    environment,
    sopsBinary: options.sopsBinary,
    spawnFile: options.spawnFile,
  });
}

export async function backupToRestic({
  environment = process.env,
  backupPath = environment.HARNESS_BACKUP_DIR || DEFAULT_BACKUP_PATH,
  auditPath = environment.HARNESS_AUDIT_DIR || DEFAULT_AUDIT_PATH,
  resticBinary,
  sopsBinary,
  spawnFile = defaultSpawn,
} = {}) {
  const resolvedEnvironment = await resolveResticEnvironment(environment, { sopsBinary, spawnFile });
  await runRestic(buildResticBackupArgs({ backupPath, auditPath }), {
    environment: resolvedEnvironment,
    resticBinary,
    spawnFile,
  });
  return Object.freeze({ backupPath: assertSafeDataPath(backupPath, "backup path"), auditPath: assertSafeDataPath(auditPath, "audit path") });
}

export async function restoreFromRestic({
  snapshot = "latest",
  target,
  environment = process.env,
  confirm = false,
  resticBinary,
  sopsBinary,
  spawnFile = defaultSpawn,
} = {}) {
  if (!confirm || environment.HARNESS_RESTORE_CONFIRM !== "YES") {
    throw deploymentError("RESTORE_CONFIRMATION_REQUIRED", "Restore requires explicit confirmation");
  }
  const args = buildResticRestoreArgs(snapshot, target);
  const resolvedEnvironment = await resolveResticEnvironment(environment, { sopsBinary, spawnFile });
  await runRestic(args, { environment: resolvedEnvironment, resticBinary, spawnFile });
  return Object.freeze({ snapshot: args[1], target: args[3] });
}

function cliArguments(argumentsList) {
  const [action, ...rest] = argumentsList;
  if (action === "backup") return { action };
  if (action === "restore") {
    const snapshot = rest.find(value => !value.startsWith("--")) || "latest";
    const target = rest.find(value => value !== snapshot && value !== "--confirm");
    return { action, snapshot, target, confirm: rest.includes("--confirm") };
  }
  throw deploymentError("INVALID_RESTIC_COMMAND", "Expected backup or restore");
}

const currentFile = nativeResolve(fileURLToPath(import.meta.url));
if (process.argv[1] && nativeResolve(process.argv[1]) === currentFile) {
  try {
    const args = cliArguments(process.argv.slice(2));
    const result = args.action === "backup"
      ? await backupToRestic()
      : await restoreFromRestic(args);
    console.log(JSON.stringify({ ok: true, ...result }));
  } catch (error) {
    console.error(JSON.stringify({
      type: "deployment.restic_error",
      error: error.code || "RESTIC_OPERATION_FAILED",
    }));
    process.exitCode = 1;
  }
}
