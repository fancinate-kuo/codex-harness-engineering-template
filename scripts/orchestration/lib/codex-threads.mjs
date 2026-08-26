import fs from "node:fs";
import path from "node:path";

const file = ".codex/orchestration/threads.json";

function load() {
  if (!fs.existsSync(file)) {
    return { version: 1, threads: {} };
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function save(data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}

export function getThread(taskId, stageId) {
  const data = load();
  return data.threads?.[taskId]?.[stageId] ?? null;
}

export function setThread(taskId, stageId, threadId) {
  const data = load();
  data.threads ??= {};
  data.threads[taskId] ??= {};
  data.threads[taskId][stageId] = threadId;
  save(data);
}
