import fs from "node:fs";
import {
  loadJson,
  saveJson,
  runFile,
  taskQueueFile,
  appendHistory
} from "./lib/state.mjs";
import { validateRequirement, hasArtifact } from "./lib/gates.mjs";
import { ensureWorktree } from "./lib/worktree.mjs";
import { shouldRunConditional } from "./lib/conditions.mjs";
import { executeWithCodex } from "./lib/codex-execute.mjs";

const taskId = process.argv[2];

if (!taskId) {
  console.log("Usage: pnpm harness:run:codex TASK-001");
  process.exit(0);
}

const workflow = loadJson(".codex/orchestration/workflow.json");
const queue = loadJson(taskQueueFile());
const task = queue?.tasks?.find(t => t.id === taskId);

if (!task) {
  console.error(`Task not found: ${taskId}`);
  process.exit(2);
}

let run = loadJson(runFile(taskId));

if (!run) {
  console.error(`Run not initialized: ${taskId}`);
  console.error(`Run: pnpm harness:run:init ${taskId}`);
  process.exit(2);
}

function stageCompleted(stage) {
  return (stage.produces ?? []).every(name => hasArtifact(taskId, name));
}

function nextStage() {
  for (const stage of workflow.stages) {
    if (stageCompleted(stage)) continue;

    if (stage.conditional && !shouldRunConditional(taskId, stage.conditional)) {
      continue;
    }

    return stage;
  }
  return null;
}

const stage = nextStage();

if (!stage) {
  run.state = "completed";
  run.currentAgent = "none";
  appendHistory(run, "orchestrator", "workflow-complete", "completed");
  saveJson(runFile(taskId), run);

  task.state = "completed";
  task.assignedAgent = null;
  task.updatedAt = new Date().toISOString();
  saveJson(taskQueueFile(), queue);

  console.log(`Workflow complete: ${taskId}`);
  process.exit(0);
}

const missing = (stage.requires ?? []).filter(req =>
  !validateRequirement(taskId, req)
);

if (missing.length) {
  console.error(`Blocked before ${stage.id}: ${missing.join(", ")}`);
  process.exit(3);
}

if (stage.mutable) {
  try {
    ensureWorktree(taskId);
    run = loadJson(runFile(taskId));
  } catch (err) {
    console.error(err.message);
    process.exit(4);
  }
}

run.state = stage.state;
run.currentAgent = stage.agent;
appendHistory(run, "orchestrator", "codex-stage-start", stage.id);
saveJson(runFile(taskId), run);

task.state = stage.state;
task.assignedAgent = stage.agent;
task.worktree = run.worktree ?? null;
task.updatedAt = new Date().toISOString();
saveJson(taskQueueFile(), queue);

try {
  const result = await executeWithCodex({
    taskId,
    stage,
    run
  });

  run = loadJson(runFile(taskId));
  appendHistory(
    run,
    stage.agent,
    "codex-turn-started",
    `${stage.id}:${result.threadId}:${result.turnId ?? "unknown-turn"}`
  );
  saveJson(runFile(taskId), run);

  console.log(JSON.stringify({
    taskId,
    stage: stage.id,
    agent: stage.agent,
    ...result,
    note: "Codex turn started. Validate expected artifacts before advancing."
  }, null, 2));
} catch (err) {
  run = loadJson(runFile(taskId));
  appendHistory(run, stage.agent, "codex-stage-error", err.message);
  saveJson(runFile(taskId), run);

  console.error(err.stack || err.message);
  process.exit(1);
}
