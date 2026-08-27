import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { spawn as defaultSpawn } from "node:child_process";

import { AUDIT_SECRET_KEYS, deploymentError } from "./secret-runtime.mjs";

const currentFile = resolve(fileURLToPath(import.meta.url));

export function runAuditShipper({
  command = process.env.HARNESS_VECTOR_BINARY || "/usr/bin/vector",
  configPath = process.env.HARNESS_VECTOR_CONFIG || "/etc/vector/harness-audit.toml",
  environment = process.env,
  spawnFile = defaultSpawn,
} = {}) {
  const childEnvironment = { ...environment };
  for (const key of AUDIT_SECRET_KEYS) {
    delete childEnvironment[key];
  }

  return new Promise((resolveCode, reject) => {
    const child = spawnFile(command, ["--config", configPath], {
      env: childEnvironment,
      shell: false,
      stdio: "inherit",
    });
    child.on("error", () => reject(deploymentError("AUDIT_SHIPPER_START_FAILED", "Audit shipper failed to start")));
    child.on("close", code => resolveCode(code ?? 1));
  });
}

if (process.argv[1] && resolve(process.argv[1]) === currentFile) {
  try {
    process.exitCode = await runAuditShipper();
  } catch (error) {
    console.error(JSON.stringify({
      type: "deployment.audit_shipper_error",
      error: error.code || "AUDIT_SHIPPER_START_FAILED",
    }));
    process.exitCode = 1;
  }
}
