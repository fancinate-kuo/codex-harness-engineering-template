import assert from "node:assert/strict";
import { createGraphProvenance } from "./lib/provenance.mjs";
import { applyStageResult, prepareRetry, validateStageResult } from "./lib/results.mjs";
import { scheduleRunnableNodes, assertNoWorktreeConflicts } from "./lib/scheduler-safety.mjs";
import { compileDag, getRunnableNodes, propagateDependencyBlocks, validateWorkflow } from "./lib/workflow.mjs";

const catalog = {
  nodes: {
    planner: { agent: "planner", mutable: false, produces: ["plan.json"] },
    impact: { agent: "impact", mutable: false, produces: ["impact.json"] },
    backend: { agent: "implementation", mutable: true, produces: ["backend-summary.json"], retryable: true },
    frontend: { agent: "implementation", mutable: true, produces: ["frontend-summary.json"], retryable: true },
    migration: { agent: "implementation", mutable: true, produces: ["migration-summary.json"], retryable: true },
    docs: { agent: "implementation", mutable: true, produces: ["docs-summary.json"] },
    integration: { agent: "integration", mutable: true, produces: ["integration-summary.json"], retryable: true },
    test: { agent: "test", mutable: false, produces: ["test-report.json"], retryable: true },
    playwright: { agent: "test", mutable: false, produces: ["playwright-report.json"], retryable: true },
    "security-review": { agent: "review", mutable: false, produces: ["security-review.json"] },
    review: { agent: "review", mutable: false, produces: ["review-report.json"] },
    pr: { agent: "pr", mutable: false, produces: ["pr-summary.json"] }
  }
};
const policy = {
  maxAutomaticRetriesPerStage: 2,
  defaults: { always: ["planner", "impact", "review", "pr"], testForCodeChanges: true, integrationForParallelMutableBranches: true },
  riskRules: { high: ["security-review", "test"], critical: ["security-review", "test"] }
};
const pool = { limits: { global: 4, mutable: 2, readOnly: 4 }, roles: { implementation: 3, test: 2, review: 2 } };

function stateFor(workflow) {
  return {
    version: 2,
    taskId: workflow.taskId,
    workflow: workflow.name,
    nodes: Object.fromEntries(workflow.nodes.map(node => [node.id, { status: "pending", retryCount: 0, worktree: null, requestId: null, attemptId: null }])),
    requests: {},
    locks: {}
  };
}

function expectNodes(input, expected) {
  const workflow = compileDag(input, policy, catalog);
  assert.deepEqual(workflow.nodes.map(node => node.id), expected);
  assert.equal(validateWorkflow(workflow, { catalog, pool, requiredNodes: ["planner", "review", "pr"] }).valid, true);
  return workflow;
}

expectNodes({ taskId: "SMOKE-BACKEND", signals: { backendChange: true } }, ["planner", "impact", "backend", "test", "review", "pr"]);
expectNodes({ taskId: "SMOKE-FULL", signals: { backendChange: true, frontendChange: true, databaseChange: true, uiBehaviorChange: true, securitySensitive: true, risk: "high" } }, ["planner", "impact", "backend", "frontend", "migration", "integration", "test", "playwright", "security-review", "review", "pr"]);
expectNodes({ taskId: "SMOKE-DOCS", signals: { docsOnly: true } }, ["planner", "docs", "review", "pr"]);
expectNodes({ taskId: "SMOKE-SECURITY", signals: { backendChange: true, securitySensitive: true, risk: "critical" } }, ["planner", "impact", "backend", "test", "security-review", "review", "pr"]);

const workflow = compileDag({ taskId: "SMOKE-SCHEDULER", signals: { backendChange: true, frontendChange: true } }, policy, catalog);
let state = stateFor(workflow);
state.nodes.planner.status = "passed";
const first = scheduleRunnableNodes(workflow, state, pool, {
  owner: "smoke",
  now: "2026-01-01T00:00:00.000Z",
  worktreeAllocator: node => ({ path: `.codex/worktrees/SMOKE-SCHEDULER__${node.id}`, branch: `agent/smoke-${node.id}` })
});
assert.equal(first.blocked, false);
assert.equal(first.requests.length, 1);
assert.equal(first.requests[0].nodeId, "impact");
assert.equal(scheduleRunnableNodes(workflow, first.state, pool, { owner: "other" }).blocked, true);

state = first.state;
state.nodes.impact.status = "passed";
state.nodes.impact.requestId = first.requests[0].requestId;
state.nodes.impact.attemptId = first.requests[0].attemptId;
const second = scheduleRunnableNodes(workflow, state, pool, {
  owner: "smoke",
  now: "2026-01-01T00:01:00.000Z",
  worktreeAllocator: node => ({ path: `.codex/worktrees/SMOKE-SCHEDULER__${node.id}`, branch: `agent/smoke-${node.id}` })
});
assert.equal(second.requests.length, 2);
assert.equal(new Set(second.requests.map(request => request.nodeId)).size, 2);

const blockedState = propagateDependencyBlocks(workflow, { ...state, nodes: { ...state.nodes, impact: { ...state.nodes.impact, status: "failed" } } });
assert.equal(blockedState.nodes.backend.status, "blocked");
const skipped = { ...state, nodes: { ...state.nodes, backend: { ...state.nodes.backend, status: "skipped" } } };
skipped.nodes.frontend.status = "passed";
const integration = workflow.nodes.find(node => node.id === "integration");
assert.equal(getRunnableNodes(workflow, skipped, pool).some(node => node.id === "integration"), false);
integration.allowSkippedDependencies = true;
assert.equal(getRunnableNodes(workflow, skipped, pool).some(node => node.id === "integration"), true);

const backend = workflow.nodes.find(node => node.id === "backend");
const backendState = stateFor(workflow);
backendState.nodes.backend.status = "running";
backendState.nodes.backend.requestId = "SMOKE-SCHEDULER:backend:request-1";
backendState.nodes.backend.attemptId = "SMOKE-SCHEDULER:backend:attempt-1";
const passed = {
  version: 1,
  taskId: workflow.taskId,
  nodeId: "backend",
  stageId: "backend",
  attemptId: backendState.nodes.backend.attemptId,
  requestId: backendState.nodes.backend.requestId,
  status: "passed",
  artifacts: ["backend-summary.json"],
  verification: { evidence: ["unit test passed"] }
};
assert.equal(validateStageResult(passed, { workflow, state: backendState }).valid, true);
const applied = applyStageResult(backendState, passed, { workflow });
assert.equal(applied.nodes.backend.status, "passed");
applied.nodes.backend.status = "failed";
applied.nodes.backend.failure = { summary: "transient failure", retryable: true };
const retried = prepareRetry(applied, "backend", workflow);
assert.equal(retried.nodes.backend.retryCount, 1);
retried.nodes.backend.status = "failed";
retried.nodes.backend.failure = { summary: "second transient failure", retryable: true };
const retriedAgain = prepareRetry(retried, "backend", workflow);
assert.equal(retriedAgain.nodes.backend.retryCount, 2);
assert.throws(() => prepareRetry({ ...retriedAgain, nodes: { ...retriedAgain.nodes, backend: { ...retriedAgain.nodes.backend, status: "failed" } } }, "backend", workflow), /Retry limit reached/);

assert.throws(() => assertNoWorktreeConflicts(workflow, { nodes: { backend: { worktree: "same", branch: "same" }, frontend: { worktree: "same", branch: "same" } } }), /conflict/);
const impactNode = workflow.nodes.find(node => node.id === "impact");
const impactState = stateFor(workflow);
impactState.nodes.impact.status = "running";
impactState.nodes.impact.requestId = "impact-request";
impactState.nodes.impact.attemptId = "impact-attempt";
assert.equal(validateStageResult({ ...passed, nodeId: impactNode.id, stageId: impactNode.id, requestId: "impact-request", attemptId: "impact-attempt", artifacts: ["impact.json"], graphProvenance: createGraphProvenance({ queryType: "impact", target: "workflow", indexedCommit: "abc123", generatedAt: "2026-01-01T00:00:00.000Z", risk: "medium", blastRadius: { summary: "one module" } }) }, { workflow, state: impactState }).valid, true);

console.log(JSON.stringify({ status: "passed", scenarios: ["backend-only", "full-stack", "docs-only", "security-sensitive", "pool-limit", "lock", "idempotency", "blocked-dependency", "retry", "skipped-join", "worktree-conflict", "artifact-result", "graph-provenance"] }, null, 2));
