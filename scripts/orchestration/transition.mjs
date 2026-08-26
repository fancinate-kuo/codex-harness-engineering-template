import fs from "node:fs";

const taskId = process.argv[2];
const nextState = process.argv[3];
const nextAgent = process.argv[4] || "orchestrator";

if (!taskId || !nextState) {
  console.log("Usage: pnpm harness:transition TASK-001 implementing implementation");
  process.exit(0);
}

const file = `.codex/orchestration/runs/${taskId}/run.json`;
if (!fs.existsSync(file)) {
  console.error(`Missing run: ${taskId}`);
  process.exit(2);
}

const run = JSON.parse(fs.readFileSync(file, "utf8"));

run.state = nextState;
run.currentAgent = nextAgent;
run.history.push({
  at: new Date().toISOString(),
  agent: nextAgent,
  action: "transition",
  result: nextState
});

fs.writeFileSync(file, JSON.stringify(run, null, 2) + "\n");
console.log(`${taskId}: ${nextState} (${nextAgent})`);
