import fs from "node:fs";
import { loadJson, runFile } from "./lib/state.mjs";
import { executeWithCodex } from "./lib/codex-execute.mjs";

const taskId = process.argv[2];
const stageId = process.argv[3];

if (!taskId || !stageId) {
  console.log("Usage: pnpm harness:codex:stage TASK-001 planner");
  process.exit(0);
}

const workflow = loadJson(".codex/orchestration/workflow.json");
const stage = workflow?.stages?.find(s => s.id === stageId);

if (!stage) {
  console.error(`Unknown stage: ${stageId}`);
  process.exit(2);
}

const run = loadJson(runFile(taskId));

if (!run) {
  console.error(`Run not found: ${taskId}`);
  process.exit(2);
}

executeWithCodex({ taskId, stage, run })
  .then(result => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch(err => {
    console.error(err.stack || err.message);
    process.exit(1);
  });
