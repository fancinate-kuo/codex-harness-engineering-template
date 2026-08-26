import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { runFile, loadJson, saveJson, appendHistory } from "./state.mjs";

export function ensureWorktree(taskId) {
  const file = runFile(taskId);
  const run = loadJson(file);

  if (!run) throw new Error(`Run not initialized: ${taskId}`);

  if (run.worktree && fs.existsSync(run.worktree)) {
    return run.worktree;
  }

  const worktree = `.codex/worktrees/${taskId}`;
  const branch = `agent/${taskId.toLowerCase()}`;

  fs.mkdirSync(".codex/worktrees", { recursive: true });

  const result = spawnSync(
    "git",
    ["worktree", "add", worktree, "-b", branch],
    {
      stdio: "inherit",
      shell: process.platform === "win32"
    }
  );

  if (result.status !== 0) {
    throw new Error(`Failed to create worktree for ${taskId}`);
  }

  run.worktree = worktree;
  appendHistory(run, "orchestrator", "worktree-create", worktree);
  saveJson(file, run);

  return worktree;
}
