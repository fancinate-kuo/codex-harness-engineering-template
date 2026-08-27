import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import {
  CONTROL_PLANE_SECRET_KEYS,
  runWithSecrets,
} from "./secret-runtime.mjs";

const currentFile = resolve(fileURLToPath(import.meta.url));
const serverFile = fileURLToPath(new URL("../../../scripts/control-plane/server.mjs", import.meta.url));

if (process.argv[1] && resolve(process.argv[1]) === currentFile) {
  try {
    const code = await runWithSecrets({
      inputPath: process.env.HARNESS_CONTROL_PLANE_SECRETS_FILE || "/etc/harness/secrets/control-plane.json.enc",
      command: process.execPath,
      args: [serverFile],
      required: CONTROL_PLANE_SECRET_KEYS,
      allowed: CONTROL_PLANE_SECRET_KEYS,
    });
    process.exitCode = code;
  } catch (error) {
    console.error(JSON.stringify({
      type: "deployment.secret_runtime_error",
      error: error.code || "DEPLOYMENT_START_FAILED",
    }));
    process.exitCode = 1;
  }
}
