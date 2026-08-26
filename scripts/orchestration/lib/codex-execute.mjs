import fs from "node:fs";
import { CodexAppServer } from "./codex-app-server.mjs";
import { getThread, setThread } from "./codex-threads.mjs";
import { buildStagePrompt } from "./stage-prompt.mjs";

function extractThreadId(response) {
  return (
    response?.thread?.id ??
    response?.threadId ??
    response?.id ??
    null
  );
}

function extractTurnId(response) {
  return (
    response?.turn?.id ??
    response?.turnId ??
    response?.id ??
    null
  );
}

export async function executeWithCodex({ taskId, stage, run }) {
  const server = new CodexAppServer();
  await server.start();

  try {
    let threadId = getThread(taskId, stage.id);

    if (threadId) {
      try {
        await server.resumeThread({ threadId });
      } catch {
        threadId = null;
      }
    }

    if (!threadId) {
      const thread = await server.startThread({
        cwd: stage.mutable && run.worktree ? run.worktree : process.cwd()
      });

      threadId = extractThreadId(thread);

      if (!threadId) {
        throw new Error("Unable to determine Codex thread ID");
      }

      setThread(taskId, stage.id, threadId);
    }

    const prompt = buildStagePrompt({ taskId, stage, run });
    const turn = await server.startTurn({
      threadId,
      text: prompt
    });

    const turnId = extractTurnId(turn);

    return {
      threadId,
      turnId,
      started: true
    };
  } finally {
    await server.stop();
  }
}
