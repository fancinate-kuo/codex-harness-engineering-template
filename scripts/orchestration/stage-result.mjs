import fs from "node:fs";
import { loadJson, saveJson, runFile, appendHistory } from "./lib/state.mjs";

const taskId = process.argv[2];
const stageId = process.argv[3];
const result = process.argv[4] || "passed";

if (!taskId || !stageId) {
  console.log("Usage: pnpm harness:stage:result TASK-001 planner passed");
  process.exit(0);
}

const file = runFile(taskId);
const run = loadJson(file);

if (!run) {
  console.error(`Run not found: ${taskId}`);
  process.exit(2);
}

appendHistory(run, run.currentAgent || stageId, "stage-result", `${stageId}:${result}`);

if (result === "failed") {
  run.retryCount = (run.retryCount ?? 0) + 1;
}

saveJson(file, run);
console.log(`${taskId} ${stageId}: ${result}`);
