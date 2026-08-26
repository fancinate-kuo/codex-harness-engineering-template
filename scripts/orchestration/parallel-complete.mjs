import { applyResultFile } from "./lib/legacy-scheduler.mjs";

const [taskId, , resultFile] = process.argv.slice(2);
if (!taskId || !resultFile) {
  console.error("Usage: pnpm harness:parallel:complete TASK-001 NODE result.json");
  process.exit(2);
}

try {
  process.exit(applyResultFile(taskId, resultFile, ".codex/orchestration/parallel-workflow.json"));
} catch (error) {
  console.error(`Stage result rejected: ${error.message}`);
  process.exit(1);
}
