import fs from "node:fs";
import { upsertTask } from "./lib/repository.mjs";
import { closePool } from "./lib/db.mjs";

const taskId=process.argv[2];
if(!taskId){
  console.log("Usage: pnpm harness:persist:task TASK-001");
  process.exit(0);
}

try {
  const queue=JSON.parse(fs.readFileSync(".codex/orchestration/queue/tasks.json","utf8"));
  const task=queue.tasks.find(t=>t.id===taskId);
  if(!task) throw new Error(`Task not found: ${taskId}`);
  await upsertTask(task);
  console.log(`Persisted task ${taskId}`);
} catch(err) {
  console.error(err.stack||err.message);
  process.exitCode=1;
} finally {
  await closePool();
}
