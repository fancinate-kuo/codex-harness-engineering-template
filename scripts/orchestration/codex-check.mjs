import { spawnSync } from "node:child_process";

const checks = [
  ["codex", ["--version"]],
  ["codex", ["app-server", "--help"]]
];

for (const [cmd, args] of checks) {
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  if (result.status !== 0) {
    console.error(`Codex check failed: ${cmd} ${args.join(" ")}`);
    process.exit(result.status ?? 1);
  }
}

console.log("Codex native adapter prerequisites PASS");
