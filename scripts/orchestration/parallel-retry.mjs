import { retryNode } from "./lib/legacy-scheduler.mjs";

const [taskId, nodeId] = process.argv.slice(2);
if (!taskId || !nodeId) {
  console.error("Usage: pnpm harness:parallel:retry TASK-001 NODE");
  process.exit(2);
}

try {
  process.exit(retryNode(taskId, nodeId, ".codex/orchestration/parallel-workflow.json"));
} catch (error) {
  console.error(`Retry rejected: ${error.message}`);
  process.exit(error.code === "RETRY_LIMIT_REACHED" ? 3 : 1);
}
