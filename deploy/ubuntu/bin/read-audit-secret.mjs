import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AUDIT_SECRET_KEYS,
  decryptSecretJson,
  deploymentError,
  validateSecretDocument,
} from "./secret-runtime.mjs";

const currentFile = resolve(fileURLToPath(import.meta.url));
const MAX_REQUEST_BYTES = 16 * 1024;

export function parseVectorSecretRequest(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || value.version !== "1.0") {
    throw deploymentError("INVALID_VECTOR_SECRET_REQUEST", "Vector secret request is invalid");
  }

  if (!Array.isArray(value.secrets) || value.secrets.length === 0 || value.secrets.some(secret => (
    typeof secret !== "string" || !AUDIT_SECRET_KEYS.includes(secret)
  ))) {
    throw deploymentError("INVALID_VECTOR_SECRET_REQUEST", "Vector requested an unsupported secret");
  }

  return value;
}

export function buildVectorSecretResponse(request, secrets) {
  const response = {};
  for (const key of request.secrets) {
    response[key] = { value: secrets[key], error: null };
  }
  return response;
}

function readStdin() {
  return new Promise((resolveInput, reject) => {
    let input = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", chunk => {
      input += chunk;
      if (Buffer.byteLength(input, "utf8") > MAX_REQUEST_BYTES) {
        reject(deploymentError("INVALID_VECTOR_SECRET_REQUEST", "Vector secret request is too large"));
        process.stdin.destroy();
      }
    });
    process.stdin.on("error", () => reject(deploymentError("INVALID_VECTOR_SECRET_REQUEST", "Vector secret request could not be read")));
    process.stdin.on("end", () => {
      try {
        resolveInput(JSON.parse(input));
      } catch {
        reject(deploymentError("INVALID_VECTOR_SECRET_REQUEST", "Vector secret request is invalid"));
      }
    });
  });
}

if (process.argv[1] && resolve(process.argv[1]) === currentFile) {
  try {
    const inputPath = process.argv[2] || "/etc/harness/secrets/audit-sink.json.enc";
    const request = parseVectorSecretRequest(await readStdin());
    const document = await decryptSecretJson(inputPath);
    const secrets = validateSecretDocument(document, {
      required: request.secrets,
      allowed: AUDIT_SECRET_KEYS,
    });
    process.stdout.write(JSON.stringify(buildVectorSecretResponse(request, secrets)));
  } catch (error) {
    process.stderr.write(`${error.code || "AUDIT_SECRET_READ_FAILED"}\n`);
    process.exitCode = 1;
  }
}
