import fs from "node:fs";

const taskId = process.argv[2];
const gate = process.argv[3];

if (!taskId || !gate) {
  console.log("Usage: pnpm harness:gate TASK-001 pre-implementation");
  process.exit(0);
}

const shared = `.codex/orchestration/shared/${taskId}`;
const exists = name => fs.existsSync(`${shared}/${name}`);

if (gate === "pre-implementation") {
  const missing = [];
  if (!exists("plan.json")) missing.push("plan.json");
  if (!exists("impact.json")) missing.push("impact.json");

  const cpDir = ".codex/checkpoints";
  const hasCheckpoint = fs.existsSync(cpDir) &&
    fs.readdirSync(cpDir).some(f => f.includes(taskId) || f.toLowerCase().includes(taskId.toLowerCase()));

  if (!hasCheckpoint) missing.push("checkpoint");

  if (missing.length) {
    console.error(`Gate FAILED: ${missing.join(", ")}`);
    process.exit(1);
  }

  console.log("Gate PASS: pre-implementation");
  process.exit(0);
}

if (gate === "pre-pr") {
  const missing = [];
  for (const f of ["test-report.json", "review-report.json", "pr-summary.json"]) {
    if (!exists(f) && f !== "pr-summary.json") missing.push(f);
  }

  if (missing.length) {
    console.error(`Gate FAILED: ${missing.join(", ")}`);
    process.exit(1);
  }

  console.log("Gate PASS: pre-pr artifacts present");
  process.exit(0);
}

console.error(`Unknown gate: ${gate}`);
process.exit(2);
