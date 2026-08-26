import { runScheduler } from "./lib/legacy-scheduler.mjs";

const taskId = process.argv[2];
if (!taskId) {
  console.log("Usage: pnpm harness:parallel:run TASK-001");
  process.exit(0);
}

process.exit(runScheduler({
  taskId,
  workflowFile: ".codex/orchestration/parallel-workflow.json",
  owner: process.env.HARNESS_SCHEDULER_OWNER ?? "parallel-scheduler"
}));
