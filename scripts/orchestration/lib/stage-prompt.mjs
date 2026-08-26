import fs from "node:fs";

export function buildStagePrompt({ taskId, stage, run }) {
  const instructionFile = `.codex/agents/${stage.agent}.md`;
  const instructions = fs.existsSync(instructionFile)
    ? fs.readFileSync(instructionFile, "utf8")
    : "";

  return `
You are the ${stage.agent} stage of the repository Harness Engineering workflow.

Task ID: ${taskId}
Stage: ${stage.id}
Current state: ${run.state}
Worktree: ${run.worktree ?? "(read-only/main workspace)"}

Agent instructions:
${instructions}

Required artifacts:
${JSON.stringify(stage.requires ?? [], null, 2)}

Expected output artifacts:
${JSON.stringify(stage.produces ?? [], null, 2)}

Shared workspace:
.codex/orchestration/shared/${taskId}

Rules:
1. Read AGENTS.md first.
2. Follow repository architecture rules.
3. Use the Business Graph and GitNexus when required by your role.
4. Do not invent completion evidence.
5. Write every expected output artifact before finishing.
6. Keep outputs machine-readable JSON when the expected artifact ends in .json.
7. If blocked, write a blocker artifact rather than pretending success.
`.trim();
}
