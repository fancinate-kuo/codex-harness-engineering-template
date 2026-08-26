import { spawnSync } from "node:child_process";
import fs from "node:fs";

const taskId = process.argv[2];
const branch = process.argv[3] || `agent/${taskId?.toLowerCase()}`;

if (!taskId) {
  console.log("Usage: pnpm harness:worktree:create TASK-001 [branch]");
  process.exit(0);
}

const worktree = `.codex/worktrees/${taskId}`;

fs.mkdirSync(".codex/worktrees", { recursive: true });

const result = spawnSync(
  "git",
  ["worktree", "add", worktree, "-b", branch],
  { stdio: "inherit", shell: process.platform === "win32" }
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const runFile = `.codex/orchestration/runs/${taskId}/run.json`;
if (fs.existsSync(runFile)) {
  const run = JSON.parse(fs.readFileSync(runFile, "utf8"));
  run.worktree = worktree;
  run.history.push({
    at: new Date().toISOString(),
    agent: "orchestrator",
    action: "worktree-create",
    result: worktree
  });
  fs.writeFileSync(runFile, JSON.stringify(run, null, 2) + "\n");
}

console.log(`Worktree ready: ${worktree}`);
