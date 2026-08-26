import { applyResultFile } from "./lib/legacy-scheduler.mjs";

const [taskId, , resultFile] = process.argv.slice(2);
if (!taskId || !resultFile) {
  console.error("Usage: pnpm harness:stage:result TASK-001 NODE result.json");
  process.exit(2);
}

try {
  process.exit(applyResultFile(taskId, resultFile));
} catch (error) {
  console.error(`Stage result rejected: ${error.message}`);
  process.exit(1);
}
