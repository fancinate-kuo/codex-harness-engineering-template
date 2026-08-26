import fs from "node:fs";
import {
  loadJson,
  saveJson,
  runFile,
  sharedDir,
  taskQueueFile,
  appendHistory
} from "./lib/state.mjs";
import { validateRequirement, hasArtifact } from "./lib/gates.mjs";
import { ensureWorktree } from "./lib/worktree.mjs";
import { shouldRunConditional } from "./lib/conditions.mjs";
import { writeInvocationRequest } from "./lib/invoke.mjs";

const taskId = process.argv[2];
const flags = new Set(process.argv.slice(3));

if (!taskId) {
  console.log(`
Usage:
  pnpm harness:run TASK-001
  pnpm harness:run TASK-001 --once
  pnpm harness:run TASK-001 --skip-harness-verify
  `);
  process.exit(0);
}

const workflow = loadJson(".codex/orchestration/workflow.json");
if (!workflow) {
  console.error("Missing .codex/orchestration/workflow.json");
  process.exit(2);
}

let run = loadJson(runFile(taskId));
if (!run) {
  console.error(`Run not initialized: ${taskId}`);
  console.error(`Run: pnpm harness:run:init ${taskId}`);
  process.exit(2);
}

const queue = loadJson(taskQueueFile());
const task = queue?.tasks?.find(t => t.id === taskId);
if (!task) {
  console.error(`Task not found in queue: ${taskId}`);
  process.exit(2);
}

const skipHarnessVerify = flags.has("--skip-harness-verify");
const once = flags.has("--once");

function stageCompleted(stage) {
  return (stage.produces ?? []).every(name => hasArtifact(taskId, name));
}

function unmetRequirements(stage) {
  return (stage.requires ?? []).filter(req =>
    !validateRequirement(taskId, req, { skipHarnessVerify })
  );
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

while (true) {
  run = loadJson(runFile(taskId));
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

  const missing = unmetRequirements(stage);
  if (missing.length) {
    console.log(`Blocked before stage '${stage.id}'. Missing: ${missing.join(", ")}`);
    console.log(`Current state: ${run.state}`);
    console.log(`Resume later with: pnpm harness:run ${taskId}`);
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
  appendHistory(run, "orchestrator", "stage-ready", stage.id);
  saveJson(runFile(taskId), run);

  task.state = stage.state;
  task.assignedAgent = stage.agent;
  task.worktree = run.worktree ?? null;
  task.updatedAt = new Date().toISOString();
  saveJson(taskQueueFile(), queue);

  const request = writeInvocationRequest({
    taskId,
    stage,
    run,
    workflow
  });

  console.log(`Stage ready: ${stage.id}`);
  console.log(`Agent: ${stage.agent}`);
  console.log(`Request: ${request}`);
  console.log(`Expected output: ${(stage.produces ?? []).join(", ") || "(none)"}`);

  if (once) {
    process.exit(0);
  }

  console.log("");
  console.log("External agent execution required.");
  console.log(`After outputs are written, rerun: pnpm harness:run ${taskId}`);
  process.exit(10);
}
