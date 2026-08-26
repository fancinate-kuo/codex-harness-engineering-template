import { createInvocationRequest } from "./invocation.mjs";
import { getRunnableNodes, propagateDependencyBlocks } from "./workflow.mjs";

function clone(value) {
  return structuredClone(value);
}

export function acquireTaskLock(state, taskId, owner, at = null) {
  const next = clone(state);
  next.locks ??= {};
  const current = next.locks[taskId];
  if (current && current.owner !== owner) {
    return { acquired: false, state: next, lock: current, reason: "task-already-locked" };
  }
  const lock = current ?? { taskId, owner, acquiredAt: at ?? next.now ?? null };
  next.locks[taskId] = lock;
  return { acquired: true, state: next, lock };
}

export function releaseTaskLock(state, taskId, owner) {
  const next = clone(state);
  const current = next.locks?.[taskId];
  if (current && current.owner === owner) delete next.locks[taskId];
  return next;
}

export function hasDuplicateRequest(state, request) {
  if (state.requests?.[request.requestId]) return true;
  return Object.values(state.nodes ?? {}).some(node =>
    node.requestId === request.requestId ||
    node.attemptId === request.attemptId ||
    (node.nodeId === request.nodeId && node.taskId === request.taskId && node.attemptId === request.attemptId)
  );
}

export function worktreeConflicts(workflow, state, assignments = []) {
  const entries = [];
  for (const node of workflow.nodes ?? []) {
    const nodeState = state.nodes?.[node.id] ?? {};
    if (!node.mutable) continue;
    if (nodeState.worktree || node.worktree) entries.push({ nodeId: node.id, worktree: nodeState.worktree ?? node.worktree, branch: nodeState.branch ?? node.branch ?? null });
  }
  entries.push(...assignments);
  const errors = [];
  for (let index = 0; index < entries.length; index += 1) {
    for (let next = index + 1; next < entries.length; next += 1) {
      const left = entries[index];
      const right = entries[next];
      if (left.nodeId === right.nodeId) continue;
      if (left.worktree && right.worktree && left.worktree === right.worktree) errors.push(`worktree path conflict: ${left.nodeId}/${right.nodeId}`);
      if (left.branch && right.branch && left.branch === right.branch) errors.push(`branch conflict: ${left.nodeId}/${right.nodeId}`);
    }
  }
  return [...new Set(errors)];
}

export function assertNoWorktreeConflicts(workflow, state, assignments = []) {
  const errors = worktreeConflicts(workflow, state, assignments);
  if (errors.length > 0) {
    const error = new Error(errors.join("; "));
    error.code = "WORKTREE_CONFLICT";
    error.conflicts = errors;
    throw error;
  }
}

export function scheduleRunnableNodes(workflow, state, pool, {
  owner = "orchestrator",
  now = null,
  worktreeAllocator = null
} = {}) {
  const locked = acquireTaskLock(state, workflow.taskId, owner, now);
  if (!locked.acquired) return { state: locked.state, requests: [], blocked: true, errors: [locked.reason] };
  let next = propagateDependencyBlocks(workflow, locked.state);
  const requests = [];
  const assignments = [];
  const runnable = getRunnableNodes(workflow, next, pool);
  for (const node of runnable) {
    const nodeState = next.nodes?.[node.id] ?? (next.nodes[node.id] = { status: "pending", retryCount: 0 });
    if (node.mutable && !nodeState.worktree && !node.worktree) {
      if (typeof worktreeAllocator !== "function") return { state: next, requests, blocked: true, errors: [`missing worktree allocator for ${node.id}`] };
      const allocation = worktreeAllocator(node, next);
      nodeState.worktree = typeof allocation === "string" ? allocation : allocation.path;
      nodeState.branch = typeof allocation === "string" ? null : allocation.branch ?? null;
    }
    const assignment = { nodeId: node.id, worktree: nodeState.worktree ?? null, branch: nodeState.branch ?? null };
    const conflicts = worktreeConflicts(workflow, next, [...assignments, assignment]);
    if (conflicts.length > 0) return { state: next, requests, blocked: true, errors: conflicts };
    assignments.push(assignment);
    const request = createInvocationRequest(node, next, { createdAt: now });
    if (hasDuplicateRequest(next, request)) continue;
    nodeState.status = "running";
    nodeState.requestId = request.requestId;
    nodeState.attemptId = request.attemptId;
    nodeState.startedAt = now;
    nodeState.active = true;
    next.requests ??= {};
    next.requests[request.requestId] = { taskId: request.taskId, nodeId: request.nodeId, attemptId: request.attemptId, status: "queued" };
    requests.push(request);
  }
  next.updatedAt = now ?? next.updatedAt ?? null;
  return { state: next, requests, blocked: false, errors: [] };
}
