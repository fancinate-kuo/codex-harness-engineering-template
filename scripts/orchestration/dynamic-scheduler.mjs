import { runScheduler } from "./lib/legacy-scheduler.mjs";

const taskId = process.argv[2];
if (!taskId) {
  console.log("Usage: pnpm harness:dag:run TASK-001");
  process.exit(0);
}

process.exit(runScheduler({
  taskId,
  owner: process.env.HARNESS_SCHEDULER_OWNER ?? "dynamic-scheduler"
}));
