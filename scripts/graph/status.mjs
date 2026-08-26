import { spawnSync } from "node:child_process";

console.log("== Graph Status ==");
console.log("Provider: GitNexus");

const result = spawnSync(
  "npx",
  ["-y", "gitnexus@latest", "status"],
  {
    stdio: "inherit",
    shell: process.platform === "win32"
  }
);

if (result.status !== 0) {
  console.error("");
  console.error("GitNexus graph is unavailable or stale.");
  console.error("Run: pnpm graph:analyze");
  process.exit(result.status ?? 1);
}
