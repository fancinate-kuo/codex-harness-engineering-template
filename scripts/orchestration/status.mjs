import fs from "node:fs";
import { loadJson, runFile, sharedDir, taskQueueFile } from "./lib/state.mjs";

const taskId = process.argv[2];

if (!taskId) {
  console.log("Usage: pnpm harness:status TASK-001");
  process.exit(0);
}

const run = loadJson(runFile(taskId));
const queue = loadJson(taskQueueFile());
const task = queue?.tasks?.find(t => t.id === taskId);

const artifacts = fs.existsSync(sharedDir(taskId))
  ? fs.readdirSync(sharedDir(taskId)).sort()
  : [];

console.log(JSON.stringify({
  task,
  run,
  artifacts
}, null, 2));
