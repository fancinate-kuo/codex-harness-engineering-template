function attemptNumber(nodeState) {
  return (nodeState?.retryCount ?? 0) + 1;
}

export function createInvocationRequest(node, state, { createdAt } = {}) {
  const nodeState = state.nodes?.[node.id] ?? {};
  const attempt = attemptNumber(nodeState);
  const attemptId = nodeState.attemptId ?? `${state.taskId}:${node.id}:attempt-${attempt}`;
  const requestId = nodeState.requestId ?? `${state.taskId}:${node.id}:request-${attempt}`;
  return {
    version: 1,
    requestId,
    attemptId,
    taskId: state.taskId,
    nodeId: node.id,
    stageId: node.id,
    agent: node.agent,
    ...(node.role ? { role: node.role } : {}),
    mutable: Boolean(node.mutable),
    worktree: nodeState.worktree ?? node.worktree ?? null,
    branch: nodeState.branch ?? node.branch ?? null,
    dependsOn: [...(node.dependsOn ?? [])],
    allowSkippedDependencies: Boolean(node.allowSkippedDependencies),
    expectedArtifacts: [...(node.produces ?? [])],
    instructions: `.codex/agents/${node.agent}.md`,
    sharedWorkspace: `.codex/orchestration/shared/${state.taskId}`,
    workflow: state.workflow ?? state.workflowName ?? null,
    ...(createdAt || state.now ? { createdAt: createdAt ?? state.now } : {})
  };
}

export function requestFileName(request) {
  return request.attemptId === `${request.taskId}:${request.nodeId}:attempt-1`
    ? `${request.taskId}__${request.nodeId}.json`
    : `${request.taskId}__${request.nodeId}__${request.attemptId.split(":").at(-1)}.json`;
}
