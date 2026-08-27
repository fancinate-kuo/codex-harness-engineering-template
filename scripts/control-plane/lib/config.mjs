import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDatabaseConfig } from "../../persistence/lib/db.mjs";
import { resolveRuntimeStoreMode } from "../../persistence/lib/runtime-store.mjs";
import { createControlPlaneSecurityConfig } from "./security.mjs";

const rootDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
const DEFAULT_HEADERS_TIMEOUT_MS = 60_000;
const DEFAULT_KEEP_ALIVE_TIMEOUT_MS = 5_000;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000;

function configError(message) {
  const error = new Error(message);
  error.code = "INVALID_CONTROL_PLANE_CONFIG";
  return error;
}

function boundedInteger(value, name, { fallback, minimum, maximum }) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw configError(`${name} must be an integer between ${minimum} and ${maximum}`);
  }
  return parsed;
}

function readVersion(environment) {
  const configured = environment.HARNESS_CONTROL_PLANE_VERSION?.trim();
  if (configured) return configured;
  try {
    return fs.readFileSync(path.join(rootDirectory, "VERSION"), "utf8").trim() || "unknown";
  } catch {
    return "unknown";
  }
}

export function createControlPlaneConfig({
  environment = process.env,
  fileConfig = {},
} = {}) {
  const host = String(
    environment.HARNESS_CONTROL_PLANE_HOST ?? fileConfig.api?.host ?? "127.0.0.1",
  ).trim();
  if (!host) throw configError("HARNESS_CONTROL_PLANE_HOST must not be empty");

  const port = boundedInteger(
    environment.HARNESS_CONTROL_PLANE_PORT ?? fileConfig.api?.port,
    "HARNESS_CONTROL_PLANE_PORT",
    { fallback: 4317, minimum: 1, maximum: 65_535 },
  );
  const runtimeStore = resolveRuntimeStoreMode(environment);
  const security = createControlPlaneSecurityConfig({
    host,
    port,
    config: fileConfig,
    env: environment,
    production: environment.NODE_ENV?.toLowerCase() === "production",
  });
  const auditFile = String(
    environment.HARNESS_CONTROL_PLANE_AUDIT_FILE
      ?? fileConfig.security?.auditFile
      ?? ".codex/observability/control-plane/audit.jsonl",
  ).trim();
  if (!auditFile) throw configError("HARNESS_CONTROL_PLANE_AUDIT_FILE must not be empty");

  const databaseConfig = getDatabaseConfig(environment);

  return Object.freeze({
    host,
    port,
    version: readVersion(environment),
    runtimeStore,
    requestTimeoutMs: boundedInteger(
      environment.HARNESS_CONTROL_PLANE_REQUEST_TIMEOUT_MS,
      "HARNESS_CONTROL_PLANE_REQUEST_TIMEOUT_MS",
      { fallback: DEFAULT_REQUEST_TIMEOUT_MS, minimum: 1_000, maximum: 300_000 },
    ),
    headersTimeoutMs: boundedInteger(
      environment.HARNESS_CONTROL_PLANE_HEADERS_TIMEOUT_MS,
      "HARNESS_CONTROL_PLANE_HEADERS_TIMEOUT_MS",
      { fallback: DEFAULT_HEADERS_TIMEOUT_MS, minimum: 1_000, maximum: 300_000 },
    ),
    keepAliveTimeoutMs: boundedInteger(
      environment.HARNESS_CONTROL_PLANE_KEEP_ALIVE_TIMEOUT_MS,
      "HARNESS_CONTROL_PLANE_KEEP_ALIVE_TIMEOUT_MS",
      { fallback: DEFAULT_KEEP_ALIVE_TIMEOUT_MS, minimum: 1_000, maximum: 120_000 },
    ),
    shutdownTimeoutMs: boundedInteger(
      environment.HARNESS_CONTROL_PLANE_SHUTDOWN_TIMEOUT_MS,
      "HARNESS_CONTROL_PLANE_SHUTDOWN_TIMEOUT_MS",
      { fallback: DEFAULT_SHUTDOWN_TIMEOUT_MS, minimum: 1_000, maximum: 120_000 },
    ),
    auditFile,
    database: Object.freeze({
      postgresConfigured: Boolean(databaseConfig.connectionString),
      max: databaseConfig.max,
      connectionTimeoutMillis: databaseConfig.connectionTimeoutMillis,
      idleTimeoutMillis: databaseConfig.idleTimeoutMillis,
    }),
    security,
  });
}
