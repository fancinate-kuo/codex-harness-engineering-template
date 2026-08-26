import fs from "node:fs";

const taskId = process.argv[2];

if (!taskId) {
  console.log("Usage: pnpm harness:resume TASK-001");
  process.exit(0);
}

const runFile = `.codex/orchestration/runs/${taskId}/run.json`;

if (!fs.existsSync(runFile)) {
  console.error(`No run state for ${taskId}`);
  process.exit(2);
}

const run = JSON.parse(fs.readFileSync(runFile, "utf8"));
const shared = `.codex/orchestration/shared/${taskId}`;

const artifacts = fs.existsSync(shared)
  ? fs.readdirSync(shared).sort()
  : [];

console.log(JSON.stringify({
  taskId,
  state: run.state,
  currentAgent: run.currentAgent,
  worktree: run.worktree,
  retryCount: run.retryCount,
  artifacts
}, null, 2));
