import { spawn as defaultSpawn } from "node:child_process";

const SECRET_KEY_PATTERN = /^[A-Z][A-Z0-9_]+$/;

export const CONTROL_PLANE_SECRET_KEYS = Object.freeze([
  "HARNESS_CONTROL_PLANE_TOKEN",
  "HARNESS_CONTROL_PLANE_ORIGINS",
  "HARNESS_DATABASE_URL",
]);

export const AUDIT_SECRET_KEYS = Object.freeze([
  "HARNESS_AUDIT_SINK_URL",
  "HARNESS_AUDIT_SINK_TOKEN",
]);

export const RESTIC_SECRET_KEYS = Object.freeze([
  "RESTIC_REPOSITORY",
  "RESTIC_PASSWORD",
]);

const DEFAULT_ALLOWED_KEYS = new Set([
  ...CONTROL_PLANE_SECRET_KEYS,
  ...AUDIT_SECRET_KEYS,
  ...RESTIC_SECRET_KEYS,
]);

export function deploymentError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function validateSecretDocument(document, { required = [], allowed = DEFAULT_ALLOWED_KEYS } = {}) {
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    throw deploymentError("INVALID_SECRET_DOCUMENT", "Secret document must be a JSON object");
  }

  const allowedKeys = new Set(allowed);
  const keys = Object.keys(document);
  const unknown = keys.filter(key => !SECRET_KEY_PATTERN.test(key) || !allowedKeys.has(key));
  if (unknown.length > 0) {
    throw deploymentError("INVALID_SECRET_DOCUMENT", "Secret document contains an unsupported key");
  }

  for (const key of keys) {
    if (typeof document[key] !== "string" || document[key].includes("\0")) {
      throw deploymentError("INVALID_SECRET_DOCUMENT", "Secret values must be strings without NUL bytes");
    }
  }

  const missing = required.filter(key => !document[key]);
  if (missing.length > 0) {
    throw deploymentError("MISSING_SECRET", "Required secret is missing");
  }

  return Object.freeze(Object.fromEntries(keys.map(key => [key, document[key]])));
}

function quoteSystemdValue(value) {
  return `"${value
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("\r", "\\r")
    .replaceAll("\n", "\\n")}"`;
}

export function renderSystemdEnvironment(document, options = {}) {
  const validated = validateSecretDocument(document, options);
  return `${Object.keys(validated)
    .sort()
    .map(key => `${key}=${quoteSystemdValue(validated[key])}`)
    .join("\n")}\n`;
}

export function decryptSecretJson(
  inputPath,
  { sopsBinary = "sops", environment = process.env, spawnFile = defaultSpawn } = {},
) {
  return new Promise((resolve, reject) => {
    let stdout = "";
    const child = spawnFile(
      sopsBinary,
      ["--decrypt", "--input-type", "json", "--output-type", "json", inputPath],
      { env: { ...environment }, shell: false, stdio: ["ignore", "pipe", "pipe"] },
    );

    child.stdout.on("data", chunk => {
      stdout += chunk.toString();
    });
    child.on("error", () => reject(deploymentError("SECRET_DECRYPTION_FAILED", "Secret decryption failed")));
    child.on("close", code => {
      if (code !== 0) {
        reject(deploymentError("SECRET_DECRYPTION_FAILED", "Secret decryption failed"));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(deploymentError("INVALID_SECRET_DOCUMENT", "Decrypted secret document is invalid"));
      }
    });
  });
}

export async function loadSecretEnvironment({
  inputPath,
  required = [],
  allowed = DEFAULT_ALLOWED_KEYS,
  environment = process.env,
  sopsBinary = "sops",
  spawnFile = defaultSpawn,
} = {}) {
  const document = await decryptSecretJson(inputPath, { sopsBinary, environment, spawnFile });
  const secrets = validateSecretDocument(document, { required, allowed });
  return Object.freeze({ ...environment, ...secrets });
}

export async function runWithSecrets({
  inputPath,
  command,
  args = [],
  required = [],
  allowed = DEFAULT_ALLOWED_KEYS,
  environment = process.env,
  sopsBinary = "sops",
  spawnFile = defaultSpawn,
  cwd,
} = {}) {
  const childEnvironment = await loadSecretEnvironment({
    inputPath,
    required,
    allowed,
    environment,
    sopsBinary,
    spawnFile,
  });

  return new Promise((resolve, reject) => {
    const child = spawnFile(command, args, {
      cwd,
      env: childEnvironment,
      shell: false,
      stdio: "inherit",
    });
    child.on("error", () => reject(deploymentError("DEPLOYMENT_COMMAND_FAILED", "Deployment command failed")));
    child.on("close", code => resolve(code ?? 1));
  });
}
