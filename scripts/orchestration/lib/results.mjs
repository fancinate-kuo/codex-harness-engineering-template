import { validateGraphProvenance, validateImpactArtifact } from "./provenance.mjs";

const RESULT_STATUSES = new Set(["passed", "failed", "blocked"]);

function clone(value) {
  return structuredClone(value);
}

function issue(code, message, path = "") {
  return { code, message, ...(path ? { path } : {}) };
}

function artifactName(artifact) {
  return typeof artifact === "string" ? artifact : artifact?.name ?? artifact?.path ?? null;
}

function artifactPath(artifact) {
  return typeof artifact === "string" ? artifact : artifact?.path ?? artifact?.name ?? null;
}

export function validateInvocationRequest(request, { workflow = null } = {}) {
  const errors = [];
  if (!request || typeof request !== "object") return { valid: false, errors: [issue("invalid-request", "Invocation request must be an object")] };
  if (request.version !== 1) errors.push(issue("invalid-request-version", "Invocation request version must be 1", "version"));
  for (const key of ["requestId", "attemptId", "taskId", "nodeId", "stageId", "agent"]) {
    if (typeof request[key] !== "string" || request[key].trim() === "") errors.push(issue("missing-request-field", `${key} is required`, key));
  }
  if (request.nodeId !== request.stageId) errors.push(issue("stage-identity-mismatch", "nodeId and stageId must match", "stageId"));
  if (!Array.isArray(request.expectedArtifacts)) errors.push(issue("invalid-request-artifacts", "expectedArtifacts must be an array", "expectedArtifacts"));
  if (Array.isArray(request.expectedArtifacts) && request.expectedArtifacts.some(artifact => typeof artifact !== "string" || artifact.trim() === "")) errors.push(issue("invalid-request-artifact", "expectedArtifacts must contain non-empty strings", "expectedArtifacts"));
  if (request.mutable && (typeof request.worktree !== "string" || request.worktree.trim() === "")) errors.push(issue("missing-mutable-worktree", "Mutable invocation requests require a worktree", "worktree"));
  if (workflow) {
    const node = workflow.nodes?.find(candidate => candidate.id === request.nodeId);
    if (!node) errors.push(issue("unknown-request-node", `Node ${request.nodeId} is not in the workflow`, "nodeId"));
    if (node && request.taskId !== workflow.taskId) errors.push(issue("task-identity-mismatch", "Request taskId does not match workflow", "taskId"));
    if (node && request.agent !== node.agent) errors.push(issue("agent-mismatch", "Request agent does not match workflow node", "agent"));
    if (node && JSON.stringify(request.expectedArtifacts) !== JSON.stringify(node.produces ?? [])) errors.push(issue("artifact-contract-mismatch", "Request expectedArtifacts do not match workflow", "expectedArtifacts"));
  }
  return { valid: errors.length === 0, errors };
}

export function validateStageResult(result, { workflow = null, state = null, artifactExists = null } = {}) {
  const errors = [];
  if (!result || typeof result !== "object") return { valid: false, errors: [issue("invalid-result", "Stage result must be an object")] };
  if (result.version !== 1) errors.push(issue("invalid-result-version", "Stage result version must be 1", "version"));
  for (const key of ["taskId", "nodeId", "stageId", "attemptId", "requestId", "status"]) {
    if (typeof result[key] !== "string" || result[key].trim() === "") errors.push(issue("missing-result-field", `${key} is required`, key));
  }
  if (!RESULT_STATUSES.has(result.status)) errors.push(issue("invalid-result-status", "status must be passed, failed, or blocked", "status"));
  if (result.nodeId !== result.stageId) errors.push(issue("stage-identity-mismatch", "nodeId and stageId must match", "stageId"));
  if (!Array.isArray(result.artifacts)) errors.push(issue("invalid-result-artifacts", "artifacts must be an array", "artifacts"));
  if (Array.isArray(result.artifacts) && result.artifacts.some(artifact => {
    if (typeof artifact === "string") return artifact.trim() === "";
    return !artifact || typeof artifact !== "object" || typeof artifact.name !== "string" || artifact.name.trim() === "";
  })) errors.push(issue("invalid-result-artifact", "Every artifact must be a non-empty name or artifact object", "artifacts"));
  const node = workflow?.nodes?.find(candidate => candidate.id === result.nodeId);
  if (workflow && !node) errors.push(issue("unknown-result-node", `Node ${result.nodeId} is not in the workflow`, "nodeId"));
  if (node) {
    if (result.taskId !== workflow.taskId) errors.push(issue("task-identity-mismatch", "Result taskId does not match workflow", "taskId"));
    const activeNode = state?.nodes?.[result.nodeId];
    if (activeNode && !["running"].includes(activeNode.status)) errors.push(issue("invalid-state-transition", `Node ${result.nodeId} must be running before it can complete`, "status"));
    if (activeNode?.requestId && activeNode.requestId !== result.requestId) errors.push(issue("request-identity-mismatch", "Result requestId does not match active request", "requestId"));
    if (activeNode?.attemptId && activeNode.attemptId !== result.attemptId) errors.push(issue("attempt-identity-mismatch", "Result attemptId does not match active attempt", "attemptId"));
    const expected = new Set(node.produces ?? []);
    const actual = new Set((result.artifacts ?? []).map(artifactName).filter(Boolean));
    if (result.status === "passed") {
      for (const name of expected) if (!actual.has(name)) errors.push(issue("missing-artifact", `Missing expected artifact: ${name}`, "artifacts"));
      if (!result.verification || !Array.isArray(result.verification.evidence) || result.verification.evidence.length === 0 || result.verification.evidence.some(evidence => typeof evidence !== "string" || evidence.trim() === "")) errors.push(issue("missing-verification-evidence", "Passed results require non-empty verification.evidence", "verification.evidence"));
      if (typeof artifactExists === "function") {
        for (const artifact of result.artifacts ?? []) if (!artifactExists(artifactPath(artifact), artifact)) errors.push(issue("artifact-not-found", `Artifact does not exist: ${artifactPath(artifact)}`, "artifacts"));
      }
    }
    if (["failed", "blocked"].includes(result.status)) {
      if (typeof result.failure?.summary !== "string" || result.failure.summary.trim() === "") errors.push(issue("missing-failure-summary", `${result.status} results require failure.summary`, "failure.summary"));
      if (result.status === "failed" && result.failure?.retryable && !node.retryable) errors.push(issue("non-retryable-node", `Node ${node.id} is not retryable`, "failure.retryable"));
    }
    if (result.status === "passed" && result.failure) errors.push(issue("invalid-passed-failure", "Passed results cannot include failure", "failure"));
    if (node.id === "impact" || node.role === "impact" || node.agent === "impact") {
      const provenance = validateGraphProvenance(result.graphProvenance);
      errors.push(...provenance.errors);
      if (result.impactArtifact) errors.push(...validateImpactArtifact(result.impactArtifact).errors);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function applyStageResult(state, result, { workflow, artifactExists = null } = {}) {
  const validation = validateStageResult(result, { workflow, state, artifactExists });
  if (!validation.valid) {
    const error = new Error(`Invalid stage result: ${validation.errors.map(item => item.message).join("; ")}`);
    error.code = "INVALID_STAGE_RESULT";
    error.validation = validation;
    throw error;
  }
  const next = clone(state);
  const node = next.nodes[result.nodeId] ?? (next.nodes[result.nodeId] = { retryCount: 0 });
  node.status = result.status;
  node.finishedAt = result.completedAt ?? state.now ?? null;
  node.artifacts = clone(result.artifacts ?? []);
  node.verification = result.verification ?? null;
  node.failure = result.failure ?? null;
  node.lastResultId = result.requestId;
  if (result.status !== "running") {
    node.active = false;
  }
  next.requests ??= {};
  if (next.requests[result.requestId]) next.requests[result.requestId].status = result.status;
  next.updatedAt = result.completedAt ?? state.now ?? next.updatedAt ?? null;
  return next;
}

export function prepareRetry(state, nodeId, workflow) {
  const current = state.nodes?.[nodeId];
  const node = workflow.nodes?.find(candidate => candidate.id === nodeId);
  if (!current || !node) throw new Error(`Unknown retry node: ${nodeId}`);
  if (current.status !== "failed") throw new Error(`Node ${nodeId} is not failed`);
  if (!node.retryable) throw new Error(`Node ${nodeId} is not retryable`);
  const maxRetries = node.maxRetries ?? 0;
  if ((current.retryCount ?? 0) >= maxRetries) {
    const error = new Error(`Retry limit reached for ${nodeId}`);
    error.code = "RETRY_LIMIT_REACHED";
    throw error;
  }
  const next = clone(state);
  const target = next.nodes[nodeId];
  target.retryCount = (target.retryCount ?? 0) + 1;
  target.status = "pending";
  target.requestId = null;
  target.attemptId = null;
  target.startedAt = null;
  target.finishedAt = null;
  target.failure = null;
  target.active = false;
  return next;
}

export { RESULT_STATUSES };
