import { describe, expect, it } from "vitest";
import { createGraphProvenance } from "../../scripts/orchestration/lib/provenance.mjs";
import {
  applyStageResult,
  prepareRetry,
  validateInvocationRequest,
  validateStageResult
} from "../../scripts/orchestration/lib/results.mjs";
import { scheduleRunnableNodes, worktreeConflicts } from "../../scripts/orchestration/lib/scheduler-safety.mjs";
import { compileDag, getRunnableNodes, propagateDependencyBlocks, validateWorkflow } from "../../scripts/orchestration/lib/workflow.mjs";

const pool = {
  limits: { global: 4, mutable: 2, readOnly: 4 },
  roles: { implementation: 3, test: 2 }
};

const catalog = {
  nodes: {
    planner: { agent: "planner", mutable: false, produces: ["plan.json"] },
    impact: { agent: "impact", mutable: false, produces: ["impact.json"] },
    backend: { agent: "implementation", mutable: true, produces: ["backend.json"], retryable: true },
    frontend: { agent: "implementation", mutable: true, produces: ["frontend.json"], retryable: true },
    integration: { agent: "integration", mutable: true, produces: ["integration.json"], retryable: true },
    test: { agent: "test", mutable: false, produces: ["test.json"], retryable: true },
    review: { agent: "review", mutable: false, produces: ["review.json"] },
    pr: { agent: "pr", mutable: false, produces: ["pr.json"] }
  }
};

const policy = {
  maxAutomaticRetriesPerStage: 2,
  defaults: { always: ["planner", "impact", "review", "pr"], testForCodeChanges: true },
  riskRules: {}
};

function stateFor(workflow) {
  return {
    version: 2,
    taskId: workflow.taskId,
    workflow: workflow.name,
    nodes: Object.fromEntries(workflow.nodes.map(node => [node.id, {
      status: "pending",
      retryCount: 0,
      requestId: null,
      attemptId: null,
      worktree: null
    }])),
    requests: {},
    locks: {}
  };
}

describe("orchestration contracts", () => {
  it("rejects duplicate nodes, missing dependencies, cycles, and unknown agents", () => {
    const duplicate = {
      taskId: "T-CONTRACT",
      poolSource: "agent-pool.json",
      nodes: [
        { id: "planner", agent: "planner", mutable: false, worktreeRequired: false, dependsOn: [], produces: [], retryable: false, maxRetries: 0 },
        { id: "planner", agent: "planner", mutable: false, worktreeRequired: false, dependsOn: ["missing"], produces: [], retryable: false, maxRetries: 0 },
        { id: "alien", agent: "unknown", mutable: false, worktreeRequired: false, dependsOn: ["planner"], produces: [], retryable: false, maxRetries: 0 }
      ]
    };
    const result = validateWorkflow(duplicate, { catalog, pool });
    expect(result.valid).toBe(false);
    expect(result.errors.map(error => error.code)).toEqual(expect.arrayContaining([
      "duplicate-node",
      "missing-dependency",
      "unknown-agent"
    ]));

    const cycle = {
      ...duplicate,
      nodes: duplicate.nodes.slice(0, 2).map((node, index) => ({
        ...node,
        id: index === 0 ? "a" : "b",
        agent: "planner",
        dependsOn: [index === 0 ? "b" : "a"]
      }))
    };
    expect(validateWorkflow(cycle, { catalog, pool }).errors.map(error => error.code)).toContain("cycle");
  });

  it("compiles code-change DAGs and enforces the mutable pool limit", () => {
    const workflow = compileDag({
      taskId: "T-POOL",
      signals: { backendChange: true, frontendChange: true }
    }, policy, catalog);
    expect(workflow.poolSource).toBe("agent-pool.json");
    expect(workflow.nodes.map(node => node.id)).toContain("integration");

    const state = stateFor(workflow);
    state.nodes.planner.status = "passed";
    state.nodes.impact.status = "passed";
    const runnable = getRunnableNodes(workflow, state, pool);
    expect(runnable.filter(node => node.mutable)).toHaveLength(2);
  });

  it("uses task locks and request identity to make dispatch idempotent", () => {
    const workflow = compileDag({ taskId: "T-IDEMPOTENT", signals: {} }, policy, catalog);
    const state = stateFor(workflow);
    state.nodes.planner.status = "passed";
    const first = scheduleRunnableNodes(workflow, state, pool, { owner: "one", now: "2026-01-01T00:00:00Z" });
    expect(first.requests).toHaveLength(1);
    expect(scheduleRunnableNodes(workflow, first.state, pool, { owner: "two" }).blocked).toBe(true);
    const sameOwner = scheduleRunnableNodes(workflow, first.state, pool, { owner: "one" });
    expect(sameOwner.requests).toHaveLength(0);
    expect(sameOwner.state.requests[first.requests[0].requestId].status).toBe("queued");
  });

  it("blocks failed dependencies and permits explicitly allowed skipped joins", () => {
    const workflow = compileDag({ taskId: "T-JOIN", signals: { backendChange: true, frontendChange: true } }, policy, catalog);
    const state = stateFor(workflow);
    state.nodes.impact.status = "failed";
    expect(propagateDependencyBlocks(workflow, state).nodes.backend.status).toBe("blocked");
    const join = workflow.nodes.find(node => node.id === "integration");
    const joinState = stateFor(workflow);
    joinState.nodes.backend.status = "skipped";
    joinState.nodes.frontend.status = "passed";
    expect(getRunnableNodes(workflow, joinState, pool)).not.toContain(join);
    join.allowSkippedDependencies = true;
    expect(getRunnableNodes(workflow, joinState, pool)).toContain(join);
  });

  it("validates result artifacts, provenance, retries, and worktree conflicts", () => {
    const workflow = compileDag({ taskId: "T-RESULT", signals: { backendChange: true, frontendChange: true } }, policy, catalog);
    const state = stateFor(workflow);
    state.nodes.backend.status = "running";
    state.nodes.backend.requestId = "request-1";
    state.nodes.backend.attemptId = "attempt-1";
    const base = {
      version: 1,
      taskId: workflow.taskId,
      nodeId: "backend",
      stageId: "backend",
      requestId: "request-1",
      attemptId: "attempt-1",
      status: "passed",
      artifacts: ["backend.json"]
    };
    expect(validateStageResult(base, { workflow, state }).valid).toBe(false);
    const passed = { ...base, verification: { evidence: ["unit test"] } };
    expect(validateStageResult(passed, { workflow, state }).valid).toBe(true);
    expect(applyStageResult(state, passed, { workflow }).nodes.backend.status).toBe("passed");

    const failed = { ...base, status: "failed", artifacts: [], failure: { summary: "transient", retryable: true } };
    const failedState = { ...state, nodes: { ...state.nodes, backend: { ...state.nodes.backend, status: "failed" } } };
    const retried = prepareRetry(failedState, "backend", workflow);
    expect(retried.nodes.backend.retryCount).toBe(1);
    expect(prepareRetry({ ...retried, nodes: { ...retried.nodes, backend: { ...retried.nodes.backend, status: "failed", failure: failed.failure } } }, "backend", workflow).nodes.backend.retryCount).toBe(2);
    expect(worktreeConflicts(workflow, { nodes: { backend: { worktree: "same", branch: "same" }, frontend: { worktree: "same", branch: "other" } } })).toHaveLength(1);

    const impactWorkflow = compileDag({ taskId: "T-IMPACT", signals: {} }, policy, catalog);
    const impactState = stateFor(impactWorkflow);
    impactState.nodes.impact.status = "running";
    impactState.nodes.impact.requestId = "impact-request";
    impactState.nodes.impact.attemptId = "impact-attempt";
    expect(validateStageResult({
      ...base,
      taskId: impactWorkflow.taskId,
      nodeId: "impact",
      stageId: "impact",
      requestId: "impact-request",
      attemptId: "impact-attempt",
      artifacts: ["impact.json"],
      verification: { evidence: ["GitNexus impact"] },
      graphProvenance: createGraphProvenance({
        queryType: "impact",
        target: "T-IMPACT",
        indexedCommit: "abc123",
        generatedAt: "2026-01-01T00:00:00Z",
        blastRadius: { summary: "one module" }
      })
    }, { workflow: impactWorkflow, state: impactState }).valid).toBe(true);
    expect(validateInvocationRequest({ mutable: true, worktree: undefined })).toEqual(expect.objectContaining({ valid: false }));
    expect(failed).toMatchObject({ status: "failed" });
  });
});
