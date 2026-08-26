import { spawnSync } from "node:child_process";

const taskId = process.argv[2];
if (!taskId) {
  console.log("Usage: pnpm harness:feedback:loop TASK-001");
  process.exit(0);
}

function run(args) {
  const r = spawnSync("node",args,{stdio:"inherit",shell:process.platform==="win32"});
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run(["scripts/orchestration/feedback-classify.mjs",taskId]);
run(["scripts/orchestration/dag-recompile-feedback.mjs",taskId]);
run(["scripts/orchestration/feedback-reset-nodes.mjs",taskId]);

console.log("");
console.log(`Feedback loop applied. Continue with: pnpm harness:dag:run ${taskId}`);
