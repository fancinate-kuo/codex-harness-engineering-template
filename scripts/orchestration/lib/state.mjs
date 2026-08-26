import fs from "node:fs";
import path from "node:path";

export function loadJson(file) {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function saveJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

export function runFile(taskId) {
  return `.codex/orchestration/runs/${taskId}/run.json`;
}

export function sharedDir(taskId) {
  return `.codex/orchestration/shared/${taskId}`;
}

export function requestDir() {
  return `.codex/orchestration/requests`;
}

export function taskQueueFile() {
  return `.codex/orchestration/queue/tasks.json`;
}

export function appendHistory(run, agent, action, result) {
  run.history ??= [];
  run.history.push({
    at: new Date().toISOString(),
    agent,
    action,
    result
  });
}
