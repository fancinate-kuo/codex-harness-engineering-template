import fs from "node:fs";
import path from "node:path";

const taskId = process.argv[2];

if (!taskId) {
  console.log("Usage: pnpm harness:run:init TASK-001");
  process.exit(0);
}

const dir = `.codex/orchestration/runs/${taskId}`;
fs.mkdirSync(dir, { recursive: true });

const run = {
  taskId,
  state: "planning",
  currentAgent: "planner",
  worktree: null,
  retryCount: 0,
  history: [{
    at: new Date().toISOString(),
    agent: "orchestrator",
    action: "run-init",
    result: "created"
  }]
};

fs.writeFileSync(path.join(dir, "run.json"), JSON.stringify(run, null, 2) + "\n");

const shared = `.codex/orchestration/shared/${taskId}`;
fs.mkdirSync(shared, { recursive: true });

console.log(`Initialized run for ${taskId}`);
