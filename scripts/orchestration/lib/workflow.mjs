import { validateGraphProvenance } from "./provenance.mjs";

const REQUIRED_LIFECYCLE_NODES = ["planner", "review", "pr"];
const DEFAULT_AGENT_NAMES = new Set(["planner", "impact", "implementation", "integration", "test", "review", "pr", "fix"]);
const DEFAULT_ORDER = [
  "planner", "impact", "backend", "frontend", "migration", "database", "docs",
  "integration", "test", "playwright", "security-review", "review", "pr"
];

function clone(value) {
  return structuredClone(value);
}

function issue(code, message, path = "") {
  return { code, message, ...(path ? { path } : {}) };
}

function catalogNodes(catalog) {
  return catalog?.nodes ?? catalog ?? {};
}

function selectedDependencies(id, selected) {
  if (id === "planner") return [];
  if (id === "impact") return selected.has("planner") ? ["planner"] : [];
  if (["backend", "frontend", "migration", "database", "docs"].includes(id)) {
    return selected.has("impact") ? ["impact"] : ["planner"];
  }
  if (id === "integration") {
    return ["backend", "frontend", "migration", "database"].filter(candidate => selected.has(candidate));
  }
  if (id === "test") {
    return selected.has("integration")
      ? ["integration"]
      : ["backend", "frontend", "migration", "database"].filter(candidate => selected.has(candidate));
  }
  if (id === "playwright") {
    return selected.has("integration")
      ? ["integration"]
      : ["frontend"].filter(candidate => selected.has(candidate));
  }
  if (id === "security-review") {
    return selected.has("integration")
      ? ["integration"]
      : ["backend", "frontend", "migration", "database"].filter(candidate => selected.has(candidate));
  }
  if (id === "review") {
    const verification = ["test", "playwright", "security-review"].filter(candidate => selected.has(candidate));
    if (verification.length > 0) return verification;
    if (selected.has("integration")) return ["integration"];
    const branches = ["backend", "frontend", "migration", "database", "docs"].filter(candidate => selected.has(candidate));
    if (branches.length > 0) return branches;
    if (selected.has("impact")) return ["impact"];
    return ["planner"];
  }
  if (id === "pr") return selected.has("review") ? ["review"] : [];
  return [];
}

function withRiskNodes(selected, signals, policy) {
  for (const node of policy.riskRules?.[signals.risk] ?? []) selected.add(node);
  return selected;
}

export function compileDag(input, policy = {}, catalog = {}) {
  if (!input?.taskId) throw new Error("DAG input requires taskId");
  const signals = { ...(input.signals ?? {}) };
  let selected;

  if (signals.docsOnly) {
    selected = new Set(["planner", "docs", "review", "pr"]);
  } else {
    selected = new Set(policy.defaults?.always ?? ["planner", "impact", "review", "pr"]);
    if (signals.backendChange) selected.add("backend");
    if (signals.frontendChange) selected.add("frontend");
    if (signals.databaseChange) selected.add("migration");
    if (signals.uiBehaviorChange) selected.add("playwright");
    if (signals.securitySensitive) selected.add("security-review");
    const mutableBranches = ["backend", "frontend", "migration"].filter(node => selected.has(node));
    if (mutableBranches.length > 0 && policy.defaults?.testForCodeChanges !== false) selected.add("test");
    if (mutableBranches.length > 1 && policy.defaults?.integrationForParallelMutableBranches !== false) selected.add("integration");
    withRiskNodes(selected, signals, policy);
  }

  const nodesById = catalogNodes(catalog);
  const orderedIds = [...new Set([...DEFAULT_ORDER, ...selected])].filter(id => selected.has(id));
  const nodes = orderedIds.map(id => {
    const base = nodesById[id];
    if (!base) throw new Error(`Node catalog missing: ${id}`);
    const retryable = Boolean(base.retryable);
    return {
      id,
      agent: base.agent,
      ...(base.role ? { role: base.role } : {}),
      mutable: Boolean(base.mutable),
      worktreeRequired: Boolean(base.mutable),
      dependsOn: selectedDependencies(id, selected),
      ...(base.allowSkippedDependencies ? { allowSkippedDependencies: true } : {}),
      produces: [...(base.produces ?? [])],
      retryable,
      maxRetries: retryable ? (base.maxRetries ?? policy.maxAutomaticRetriesPerStage ?? 2) : 0
    };
  });

  return {
    version: 2,
    name: `compiled-${input.taskId}`,
    taskId: input.taskId,
    poolSource: "agent-pool.json",
    signals,
    nodes,
    ...(input.compiledAt ? { compiledAt: input.compiledAt } : {})
  };
}

function cycleErrors(nodesById) {
  const errors = [];
  const visiting = new Set();
  const visited = new Set();
  function visit(id) {
    if (visiting.has(id)) return false;
    if (visited.has(id)) return true;
    visiting.add(id);
    for (const dependency of nodesById[id]?.dependsOn ?? []) {
      if (!visit(dependency)) return false;
    }
    visiting.delete(id);
    visited.add(id);
    return true;
  }
  for (const id of Object.keys(nodesById)) {
    if (!visit(id)) {
      errors.push(issue("cycle", "Workflow contains a dependency cycle"));
      break;
    }
  }
  return errors;
}

export function validateWorkflow(workflow, { catalog = {}, pool = null, requiredNodes = [] } = {}) {
  const errors = [];
  if (!workflow || typeof workflow !== "object") {
    return { valid: false, errors: [issue("invalid-workflow", "Workflow must be an object")] };
  }
  if (typeof workflow.taskId !== "string" || workflow.taskId.trim() === "") {
    errors.push(issue("missing-task-id", "Workflow taskId is required", "taskId"));
  }
  if (!Array.isArray(workflow.nodes) || workflow.nodes.length === 0) {
    errors.push(issue("missing-nodes", "Workflow must contain at least one node", "nodes"));
    return { valid: false, errors };
  }
  const byId = {};
  for (const [index, node] of workflow.nodes.entries()) {
    if (!node || typeof node !== "object" || typeof node.id !== "string" || node.id.trim() === "") {
      errors.push(issue("invalid-node", "Every workflow node needs a non-empty id", `nodes[${index}]`));
      continue;
    }
    if (byId[node.id]) errors.push(issue("duplicate-node", `Duplicate node id: ${node.id}`, `nodes[${index}].id`));
    byId[node.id] = node;
    const known = catalogNodes(catalog);
    const knownAgents = Object.keys(known).length > 0
      ? new Set(Object.values(known).map(value => value?.agent).filter(Boolean))
      : DEFAULT_AGENT_NAMES;
    if (!knownAgents.has(node.agent)) {
      errors.push(issue("unknown-agent", `Unknown agent: ${node.agent}`, `nodes[${index}].agent`));
    }
    if (typeof node.agent !== "string" || node.agent.trim() === "") {
      errors.push(issue("missing-agent", `Node ${node.id} needs an agent`, `nodes[${index}].agent`));
    }
    if (!Array.isArray(node.dependsOn)) errors.push(issue("invalid-dependencies", `Node ${node.id} dependsOn must be an array`, `nodes[${index}].dependsOn`));
    if (node.mutable && node.worktreeRequired !== true) errors.push(issue("mutable-worktree-policy", `Mutable node ${node.id} must require a worktree`, `nodes[${index}]`));
    if (!Array.isArray(node.produces)) errors.push(issue("invalid-artifacts", `Node ${node.id} produces must be an array`, `nodes[${index}].produces`));
    if (!Number.isInteger(node.maxRetries) || node.maxRetries < 0) errors.push(issue("invalid-retry-policy", `Node ${node.id} maxRetries must be a non-negative integer`, `nodes[${index}].maxRetries`));
    if (!node.retryable && node.maxRetries > 0) errors.push(issue("invalid-retry-policy", `Non-retryable node ${node.id} cannot have retries`, `nodes[${index}].maxRetries`));
  }
  for (const node of Object.values(byId)) {
    for (const dependency of node.dependsOn ?? []) {
      if (!byId[dependency]) errors.push(issue("missing-dependency", `${node.id} depends on missing node ${dependency}`, `nodes.${node.id}.dependsOn`));
      if (dependency === node.id) errors.push(issue("self-dependency", `${node.id} cannot depend on itself`, `nodes.${node.id}.dependsOn`));
    }
  }
  errors.push(...cycleErrors(byId));
  for (const required of requiredNodes) {
    if (!byId[required]) errors.push(issue("missing-lifecycle-node", `Workflow requires ${required}`, "nodes"));
  }
  if (workflow.poolSource !== "agent-pool.json") errors.push(issue("invalid-pool-source", "Workflow must use agent-pool.json as its pool source", "poolSource"));
  if (pool) {
    const limits = pool.limits ?? {};
    for (const key of ["global", "mutable", "readOnly"]) {
      if (!Number.isInteger(limits[key]) || limits[key] < 1) errors.push(issue("invalid-pool-limit", `${key} pool limit must be a positive integer`, `limits.${key}`));
    }
    if (limits.mutable > limits.global) errors.push(issue("invalid-pool-limit", "mutable pool limit cannot exceed global limit", "limits.mutable"));
    if (limits.readOnly > limits.global) errors.push(issue("invalid-pool-limit", "readOnly pool limit cannot exceed global limit", "limits.readOnly"));
  }
  return { valid: errors.length === 0, errors };
}

function nodeStatus(state, id) {
  return state.nodes?.[id]?.status ?? "pending";
}

export function dependencySatisfied(node, state) {
  return (node.dependsOn ?? []).every(dependency => {
    const status = nodeStatus(state, dependency);
    if (status === "passed") return true;
    if (status === "skipped" && (node.allowSkippedDependencies === true || node.allowedSkippedDependencies?.includes(dependency))) return true;
    return false;
  });
}

export function hasFailedDependency(node, state) {
  return (node.dependsOn ?? []).some(dependency => ["failed", "blocked"].includes(nodeStatus(state, dependency)));
}

export function propagateDependencyBlocks(workflow, state) {
  const next = clone(state);
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of workflow.nodes ?? []) {
      const current = next.nodes?.[node.id];
      if (!current || ["passed", "running", "failed", "blocked", "skipped"].includes(current.status)) continue;
      if (hasFailedDependency(node, next)) {
        current.status = "blocked";
        current.blockedReason = "dependency-failed-or-blocked";
        changed = true;
      }
    }
  }
  return next;
}

export function getRunnableNodes(workflow, state, pool = {}) {
  const limits = pool.limits ?? {};
  const roles = pool.roles ?? {};
  const running = Object.entries(state.nodes ?? {}).filter(([, value]) => value.status === "running");
  let global = running.length;
  let mutable = running.filter(([id]) => workflow.nodes.find(node => node.id === id)?.mutable).length;
  let readOnly = global - mutable;
  const roleUsage = {};
  for (const [id, value] of running) {
    const node = workflow.nodes.find(candidate => candidate.id === id);
    if (node) roleUsage[node.agent] = (roleUsage[node.agent] ?? 0) + 1;
  }
  const runnable = [];
  for (const node of workflow.nodes ?? []) {
    const current = state.nodes?.[node.id] ?? { status: "pending" };
    if (!["pending", "ready"].includes(current.status)) continue;
    if (current.requestId || current.attemptId || hasFailedDependency(node, state) || !dependencySatisfied(node, state)) continue;
    if (global >= (limits.global ?? Infinity)) break;
    if (node.mutable && mutable >= (limits.mutable ?? Infinity)) continue;
    if (!node.mutable && readOnly >= (limits.readOnly ?? Infinity)) continue;
    if ((roleUsage[node.agent] ?? 0) >= (roles[node.agent] ?? Infinity)) continue;
    runnable.push(node);
    global += 1;
    if (node.mutable) mutable += 1;
    else readOnly += 1;
    roleUsage[node.agent] = (roleUsage[node.agent] ?? 0) + 1;
  }
  return runnable;
}

export { REQUIRED_LIFECYCLE_NODES };
