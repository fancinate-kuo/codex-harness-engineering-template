import { spawnSync } from "node:child_process";

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

if (!process.env.HARNESS_DATABASE_URL) {
  if (process.env.HARNESS_REQUIRE_POSTGRES === "1") {
    console.error("PostgreSQL contract tests require HARNESS_DATABASE_URL");
    process.exit(1);
  }
  console.log("PostgreSQL contract tests skipped: HARNESS_DATABASE_URL is not set");
  process.exit(0);
}

const steps = [
  ["db:migrate"],
  ["db:migrate"],
  ["db:check"],
  ["db:seed"],
  ["exec", "vitest", "run", "tests/integration/postgres-readiness.test.mjs", "--config", "vitest.config.ts"],
];

for (const args of steps) {
  const result = spawnSync(pnpm, args, {
    stdio: "inherit",
    shell: false,
    env: process.env,
  });
  if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
}
