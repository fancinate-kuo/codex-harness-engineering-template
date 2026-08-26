import fs from "node:fs";

const taskId = process.argv[2];
if (!taskId) {
  console.log("Usage: pnpm harness:feedback:plan TASK-001");
  process.exit(0);
}

const dir = `.codex/orchestration/shared/${taskId}/feedback`;
const policy = JSON.parse(fs.readFileSync(".codex/orchestration/feedback-policy.json","utf8"));

if (!fs.existsSync(dir)) {
  console.log(JSON.stringify({taskId,action:"none",events:[]},null,2));
  process.exit(0);
}

const events = fs.readdirSync(dir)
  .filter(f=>f.endsWith(".json"))
  .map(f=>({file:f,...JSON.parse(fs.readFileSync(`${dir}/${f}`,"utf8"))}))
  .filter(e=>e.status==="failed");

const decisions = events.map(e => {
  const cls = e.classification ?? "unknown";
  return {
    file:e.file,
    classification:cls,
    ...(policy.classifications[cls] ?? policy.classifications.unknown)
  };
});

const requiresReplan = decisions.some(d=>d.action==="replan");
const blocked = decisions.some(d=>d.action==="block");

console.log(JSON.stringify({
  taskId,
  action: blocked ? "block" : requiresReplan ? "replan" : decisions.length ? "retry" : "none",
  decisions
},null,2));
