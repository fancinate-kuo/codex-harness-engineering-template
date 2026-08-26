import fs from "node:fs";
import path from "node:path";
import { ensureNodeWorktree } from "./node-worktree.mjs";
import { evaluateCondition } from "./parallel-conditions.mjs";
import { applyStageResult, prepareRetry } from "./results.mjs";
import { createInvocationRequest, requestFileName } from "./invocation.mjs";
import { scheduleRunnableNodes } from "./scheduler-safety.mjs";
import { validateWorkflow } from "./workflow.mjs";

export const ORCHESTRATION_ROOT = ".codex/orchestration";

export function readJson(file) {
  return JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
}

export function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

export function normalizeWorkflow(workflow, taskId, maxRetries = 2) {
  return {
    ...workflow,
    version: 2,
    taskId: workflow.taskId ?? taskId,
    poolSource: "agent-pool.json",
    nodes: (workflow.nodes ?? []).map(node => ({
      ...node,
      worktreeRequired: node.worktreeRequired ?? Boolean(node.mutable),
      produces: [...(node.produces ?? [])],
      retryable: Boolean(node.retryable),
      maxRetries: node.maxRetries ?? (node.retryable ? maxRetries : 0),
      dependsOn: [...(node.dependsOn ?? [])]
    }))
  };
}

export function loadWorkflow(taskId, preferredFile = null) {
  const candidates = [
    preferredFile,
    `${ORCHESTRATION_ROOT}/runs/${taskId}/compiled-workflow.json`,
    `${ORCHESTRATION_ROOT}/parallel-workflow.json`
  ].filter(Boolean);
  const file = candidates.find(candidate => fs.existsSync(candidate));
  if (!file) throw new Error(`Missing workflow for ${taskId}`);
  const policy = readJson(`${ORCHESTRATION_ROOT}/policies.json`);
  return { file, policy, workflow: normalizeWorkflow(readJson(file), taskId, policy.maxAutomaticRetriesPerStage ?? 2) };
}

export function loadState(taskId) {
  const file = `${ORCHESTRATION_ROOT}/runs/${taskId}/dag.json`;
  if (!fs.existsSync(file)) throw new Error(`Missing DAG state: ${file}`);
  return { file, state: readJson(file) };
}

export function allocateNodeWorktree(taskId, node) {
  const worktree = `.codex/worktrees/${taskId}__${node.id}`;
  const branch = `agent/${taskId.toLowerCase()}-${node.id}`;
  ensureNodeWorktree(taskId, node.id);
  return { path: worktree, branch };
}

export function markConditionalNodes(workflow, state, taskId, now = new Date().toISOString()) {
  for (const node of workflow.nodes ?? []) {
    const current = state.nodes?.[node.id];
    if (!current || current.status !== "pending" || !node.conditional) continue;
    if (!evaluateCondition(taskId, node.conditional)) {
      current.status = "skipped";
      current.finishedAt = now;
      current.active = false;
    }
  }
  return state;
}

export function validateLoadedWorkflow(workflow, pool) {
  return validateWorkflow(workflow, {
    catalog: { nodes: Object.fromEntries(workflow.nodes.map(node => [node.id, node])) },
    pool,
    requiredNodes: ["planner", "review", "pr"]
  });
}

export function runScheduler({ taskId, workflowFile, owner = "orchestrator" }) {
  const { file: resolvedWorkflowFile, policy, workflow } = loadWorkflow(taskId, workflowFile);
  const { file: stateFile, state } = loadState(taskId);
  const pool = readJson(`${ORCHESTRATION_ROOT}/agent-pool.json`);
  const validation = validateLoadedWorkflow(workflow, pool);
  if (!validation.valid) {
    console.error("Workflow validation FAILED");
    for (const error of validation.errors) console.error(`- ${error.message}`);
    return 1;
  }

  state.version = 2;
  state.taskId = taskId;
  state.workflow = workflow.name;
  state.nodes ??= {};
  for (const node of workflow.nodes) state.nodes[node.id] ??= { status: "pending", retryCount: 0 };
  markConditionalNodes(workflow, state, taskId);

  const result = scheduleRunnableNodes(workflow, state, pool, {
    owner,
    now: new Date().toISOString(),
    worktreeAllocator: (node) => allocateNodeWorktree(taskId, node)
  });
  if (result.blocked && result.requests.length === 0) {
    console.error(`Scheduler blocked: ${result.errors.join("; ")}`);
    return 10;
  }

  const requestDirectory = `${ORCHESTRATION_ROOT}/requests`;
  for (const request of result.requests) writeJson(`${requestDirectory}/${requestFileName(request)}`, request);
  result.state.updatedAt = new Date().toISOString();
  writeJson(stateFile, result.state);
  console.log(JSON.stringify({
    taskId,
    workflow: resolvedWorkflowFile,
    policyMaxRetries: policy.maxAutomaticRetriesPerStage ?? 2,
    started: result.requests.map(request => ({ node: request.nodeId, requestId: request.requestId, worktree: request.worktree })),
    state: Object.fromEntries(Object.entries(result.state.nodes).map(([id, node]) => [id, node.status]))
  }, null, 2));
  return 0;
}

export function applyResultFile(taskId, resultFile, workflowFile = null) {
  const { workflow } = loadWorkflow(taskId, workflowFile);
  const { file: stateFile, state } = loadState(taskId);
  const result = readJson(resultFile);
  const next = applyStageResult(state, result, {
    workflow,
    artifactExists: artifactPath => fs.existsSync(path.resolve(artifactPath))
  });
  next.updatedAt = new Date().toISOString();
  writeJson(stateFile, next);
  console.log(`${taskId}/${result.nodeId}: ${result.status}`);
  return 0;
}

export function retryNode(taskId, nodeId, workflowFile = null) {
  const { workflow } = loadWorkflow(taskId, workflowFile);
  const { file: stateFile, state } = loadState(taskId);
  const next = prepareRetry(state, nodeId, workflow);
  next.updatedAt = new Date().toISOString();
  writeJson(stateFile, next);
  console.log(`Retry scheduled: ${taskId}/${nodeId}`);
  return 0;
}
