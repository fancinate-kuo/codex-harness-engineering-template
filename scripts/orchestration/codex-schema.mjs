import { spawnSync } from "node:child_process";
import fs from "node:fs";

const out = ".codex/orchestration/generated-schema";
fs.mkdirSync(out, { recursive: true });

const result = spawnSync(
  "codex",
  ["app-server", "generate-json-schema", "--out", out],
  {
    stdio: "inherit",
    shell: process.platform === "win32"
  }
);

process.exit(result.status ?? 1);
