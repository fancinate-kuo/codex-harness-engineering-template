import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { deploymentError } from "./secret-runtime.mjs";

export const DEPLOYMENT_TARGET = Object.freeze({
  id: "ubuntu-24.04-single-host",
  edge: "Caddy",
  process: "systemd",
  secrets: "SOPS/age",
  audit: "Vector HTTPS sink",
  database: "PostgreSQL 16 with pg_dump and restic",
});

const REQUIRED_FILES = Object.freeze([
  "caddy/Caddyfile",
  "systemd/harness-control-plane.service",
  "systemd/harness-audit-shipper.service",
  "systemd/harness-postgres-backup.service",
  "systemd/harness-postgres-backup.timer",
  "vector/harness-audit.toml",
  "bin/read-audit-secret.mjs",
  "secrets/control-plane.json.example",
  "secrets/audit-sink.json.example",
  "secrets/restic.json.example",
]);

const REQUIRED_CONTENT = Object.freeze({
  "caddy/Caddyfile": [
    "tls",
    "reverse_proxy 127.0.0.1:4317",
    "request_body",
    "max_size 1MB",
    "request>headers>Authorization delete",
    "request>uri delete",
  ],
  "systemd/harness-control-plane.service": [
    "User=harness",
    "NoNewPrivileges=true",
    "ProtectSystem=strict",
    "run-control-plane.mjs",
  ],
  "systemd/harness-audit-shipper.service": [
    "run-audit-shipper.mjs",
    "HARNESS_AUDIT_SECRETS_FILE",
  ],
  "systemd/harness-postgres-backup.service": [
    "postgres-backup.mjs backup",
    "HARNESS_BACKUP_DIR",
    "restic-backup.mjs backup",
  ],
  "systemd/harness-postgres-backup.timer": [
    "OnCalendar=*-*-* 02:00:00",
    "Persistent=true",
  ],
  "vector/harness-audit.toml": [
    "type = \"file\"",
    "type = \"http\"",
    "type = \"exec\"",
    "SECRET[audit_sink.HARNESS_AUDIT_SINK_URL]",
    "SECRET[audit_sink.HARNESS_AUDIT_SINK_TOKEN]",
  ],
  "bin/read-audit-secret.mjs": [
    "version !== \"1.0\"",
    "decryptSecretJson",
    "AUDIT_SECRET_KEYS",
  ],
});

export function validateDeploymentTarget(rootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..")) {
  const missing = [];
  const invalid = [];
  for (const relativePath of REQUIRED_FILES) {
    const filePath = resolve(rootDirectory, relativePath);
    if (!fs.existsSync(filePath)) {
      missing.push(relativePath);
      continue;
    }
    const content = fs.readFileSync(filePath, "utf8");
    for (const expected of REQUIRED_CONTENT[relativePath] || []) {
      if (!content.includes(expected)) invalid.push(`${relativePath}: missing ${expected}`);
    }
  }
  if (missing.length || invalid.length) {
    throw deploymentError("INVALID_DEPLOYMENT_TARGET", "Deployment target contract is incomplete");
  }
  return Object.freeze({ ok: true, target: DEPLOYMENT_TARGET, files: REQUIRED_FILES.length });
}

const currentFile = resolve(fileURLToPath(import.meta.url));
if (process.argv[1] && resolve(process.argv[1]) === currentFile) {
  try {
    console.log(JSON.stringify(validateDeploymentTarget()));
  } catch (error) {
    console.error(JSON.stringify({
      type: "deployment.target_validation_error",
      error: error.code || "INVALID_DEPLOYMENT_TARGET",
    }));
    process.exitCode = 1;
  }
}
