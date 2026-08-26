import fs from "node:fs";

const taskId = process.argv[2];
if (!taskId) {
  console.log("Usage: pnpm harness:dag:validate TASK-001");
  process.exit(0);
}

const file = `.codex/orchestration/runs/${taskId}/compiled-workflow.json`;
if (!fs.existsSync(file)) {
  console.error(`Missing compiled workflow: ${file}`);
  process.exit(2);
}

const wf = JSON.parse(fs.readFileSync(file,"utf8"));
const ids = new Set((wf.nodes ?? []).map(n => n.id));
const errors = [];

if (ids.size !== (wf.nodes ?? []).length) errors.push("Duplicate node IDs");

for (const n of wf.nodes ?? []) {
  for (const d of n.dependsOn ?? []) {
    if (!ids.has(d)) errors.push(`${n.id} depends on missing node ${d}`);
    if (d === n.id) errors.push(`${n.id} depends on itself`);
  }
}

function visit(id, visiting, visited, byId) {
  if (visiting.has(id)) return false;
  if (visited.has(id)) return true;
  visiting.add(id);
  for (const d of byId[id]?.dependsOn ?? []) {
    if (!visit(d, visiting, visited, byId)) return false;
  }
  visiting.delete(id);
  visited.add(id);
  return true;
}

const byId = Object.fromEntries((wf.nodes ?? []).map(n => [n.id,n]));
const visiting = new Set(), visited = new Set();
for (const id of ids) {
  if (!visit(id,visiting,visited,byId)) {
    errors.push("Cycle detected");
    break;
  }
}

if (!ids.has("planner")) errors.push("planner is required");
if (!ids.has("pr")) errors.push("pr is required");
if (!ids.has("review")) errors.push("review is required");

if (errors.length) {
  console.error("Compiled DAG validation FAILED");
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log("Compiled DAG validation PASS");
console.log(`Nodes: ${[...ids].join(", ")}`);
