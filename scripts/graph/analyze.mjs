import { spawnSync } from "node:child_process";

console.log("== GitNexus Analyze ==");

const result = spawnSync(
  "npx",
  ["-y", "gitnexus@latest", "analyze"],
  {
    stdio: "inherit",
    shell: process.platform === "win32"
  }
);

process.exit(result.status ?? 1);
