import fs from "node:fs";
import { upsertTask, saveDag, saveApproval } from "./lib/repository.mjs";
import { closePool } from "./lib/db.mjs";

const taskId=process.argv[2];
if(!taskId){
  console.log("Usage: pnpm harness:persist:snapshot TASK-001");
  process.exit(0);
}

try {
  const queue=JSON.parse(fs.readFileSync(".codex/orchestration/queue/tasks.json","utf8"));
  const task=queue.tasks.find(t=>t.id===taskId);
  if(task) await upsertTask(task);

  const runDir=`.codex/orchestration/runs/${taskId}`;
  const wfFile=`${runDir}/compiled-workflow.json`;
  const dagFile=`${runDir}/dag.json`;
  if(fs.existsSync(wfFile) && fs.existsSync(dagFile)) {
    await saveDag(
      taskId,
      JSON.parse(fs.readFileSync(wfFile,"utf8")),
      JSON.parse(fs.readFileSync(dagFile,"utf8"))
    );
  }

  const approvalFile=`.codex/orchestration/shared/${taskId}/approval.json`;
  if(fs.existsSync(approvalFile)) {
    await saveApproval(taskId,JSON.parse(fs.readFileSync(approvalFile,"utf8")));
  }

  console.log(`Persisted snapshot for ${taskId}`);
} catch(err) {
  console.error(err.stack||err.message);
  process.exitCode=1;
} finally {
  await closePool();
}
