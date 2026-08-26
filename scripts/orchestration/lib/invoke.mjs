import fs from "node:fs";
import path from "node:path";
import { requestDir, sharedDir, saveJson } from "./state.mjs";

export function writeInvocationRequest({ taskId, stage, run, workflow }) {
  const file = `${requestDir()}/${taskId}__${stage.id}.json`;

  const request = {
    taskId,
    stageId: stage.id,
    agent: stage.agent,
    state: stage.state,
    mutable: stage.mutable,
    worktree: run.worktree ?? null,
    agentInstructions: `.codex/agents/${stage.agent}.md`,
    sharedWorkspace: sharedDir(taskId),
    requires: stage.requires ?? [],
    expectedOutputs: stage.produces ?? [],
    workflow: workflow.name,
    createdAt: new Date().toISOString()
  };

  saveJson(file, request);
  return file;
}
