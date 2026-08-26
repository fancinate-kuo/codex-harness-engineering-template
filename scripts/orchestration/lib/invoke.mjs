import { requestDir, sharedDir, saveJson } from "./state.mjs";

export function writeInvocationRequest({ taskId, stage, run, workflow }) {
  const file = `${requestDir()}/${taskId}__${stage.id}.json`;

  run.attempts ??= {};
  const attempt = run.attempts[stage.id] ?? 1;
  run.attempts[stage.id] = attempt;
  const requestId = `${taskId}:${stage.id}:request-${attempt}`;
  const attemptId = `${taskId}:${stage.id}:attempt-${attempt}`;

  const request = {
    version: 1,
    requestId,
    attemptId,
    taskId,
    nodeId: stage.id,
    stageId: stage.id,
    agent: stage.agent,
    ...(stage.role ? { role: stage.role } : {}),
    mutable: Boolean(stage.mutable),
    worktree: run.worktree ?? null,
    branch: run.branch ?? null,
    dependsOn: stage.dependsOn ?? [],
    allowSkippedDependencies: Boolean(stage.allowSkippedDependencies),
    expectedArtifacts: stage.produces ?? [],
    instructions: `.codex/agents/${stage.agent}.md`,
    sharedWorkspace: sharedDir(taskId),
    workflow: workflow.name,
    createdAt: new Date().toISOString()
  };

  saveJson(file, request);
  return file;
}
