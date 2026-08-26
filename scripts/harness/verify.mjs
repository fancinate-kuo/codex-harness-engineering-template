import { spawnSync } from "node:child_process";

const steps = [
  ["lint", ["run", "lint"]],
  ["typecheck", ["run", "typecheck"]],
  ["unit", ["run", "test:unit"]],
  ["integration", ["run", "test:integration"]],
  ["architecture", ["run", "test:architecture"]],
  ["repo-map", ["run", "harness:repo-map"]],
  ["business-graph", ["run", "graph:business:validate"]],
  ["memory", ["run", "harness:memory:validate"]]
];

for (const [name, args] of steps) {
  console.log(`\n== Harness Gate: ${name} ==`);
  const result = spawnSync("pnpm", args, {
    stdio: "inherit",
    shell: process.platform === "win32"
  });
  if (result.status !== 0) {
    console.error(`Harness Gate FAILED at: ${name}`);
    process.exit(result.status ?? 1);
  }
}

if (process.env.HARNESS_SKIP_GRAPH !== "1") {
  console.log("\n== Harness Gate: graph freshness ==");
  const graph = spawnSync("pnpm", ["run", "graph:status"], {
    stdio: "inherit",
    shell: process.platform === "win32"
  });
  if (graph.status !== 0) {
    console.error("Harness Gate FAILED at: graph freshness");
    console.error("Run `pnpm graph:analyze`, or set HARNESS_SKIP_GRAPH=1 only for approved bootstrap/CI cases.");
    process.exit(graph.status ?? 1);
  }
} else {
  console.log("\n== Harness Gate: graph freshness SKIPPED by HARNESS_SKIP_GRAPH=1 ==");
}

console.log("\nHarness Gate = PASS");
