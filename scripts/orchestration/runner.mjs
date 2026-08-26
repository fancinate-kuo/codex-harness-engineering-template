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
import { ensureNodeWorktree } from "./lib/node-worktree.mjs";
import { shouldRunConditional } from "./lib/conditions.mjs";
import { writeInvocationRequest } from "./lib/invoke.mjs";
import { validateInvocationRequest, validateStageResult } from "./lib/results.mjs";

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
  const resultFile = `${sharedDir(taskId)}/${stage.id}.result.json`;
  const result = loadJson(resultFile);
  if (!result) return false;

  const request = loadJson(`.codex/orchestration/requests/${taskId}__${stage.id}.json`);
  if (!request) return false;

  const node = {
    id: stage.id,
    agent: stage.agent,
    role: stage.role,
    mutable: Boolean(stage.mutable),
    worktreeRequired: Boolean(stage.mutable),
    produces: stage.produces ?? [],
    retryable: Boolean(stage.retryable),
    maxRetries: stage.maxRetries ?? (stage.retryable ? 2 : 0)
  };
  const workflowContract = { taskId, nodes: [node] };
  const requestValidation = validateInvocationRequest(request, { workflow: workflowContract });
  const resultValidation = validateStageResult(result, {
    workflow: workflowContract,
    artifactExists: artifact => hasArtifact(taskId, artifact)
  });
  if (!requestValidation.valid || !resultValidation.valid) {
    const errors = [...requestValidation.errors, ...resultValidation.errors];
    console.error(`Stage result rejected for ${stage.id}: ${errors.map(error => error.message).join("; ")}`);
    return false;
  }
  if (result.requestId !== request.requestId || result.attemptId !== request.attemptId) {
    console.error(`Stage result identity mismatch for ${stage.id}`);
    return false;
  }
  return result.status === "passed";
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
      run.worktree = ensureNodeWorktree(taskId, stage.id);
      saveJson(runFile(taskId), run);
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
  saveJson(runFile(taskId), run);

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
