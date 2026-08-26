import { spawnSync } from "node:child_process";

const action = process.argv[2] || "status";
const allowed = new Set(["status", "analyze", "setup", "list"]);

if (!allowed.has(action)) {
  console.error(`Unsupported GitNexus action: ${action}`);
  console.error(`Allowed: ${[...allowed].join(", ")}`);
  process.exit(2);
}

const args = ["-y", "gitnexus@latest", action];
const result = spawnSync("npx", args, {
  stdio: "inherit",
  shell: process.platform === "win32"
});

process.exit(result.status ?? 1);
