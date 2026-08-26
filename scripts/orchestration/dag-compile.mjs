import fs from "node:fs";
import { compileDag, validateWorkflow } from "./lib/workflow.mjs";

const taskId = process.argv[2];
if (!taskId) {
  console.log("Usage: pnpm harness:dag:compile TASK-001");
  process.exit(0);
}

const dir = `.codex/orchestration/shared/${taskId}`;
const inputFile = `${dir}/dag-input.json`;

if (!fs.existsSync(inputFile)) {
  console.error(`Missing ${inputFile}`);
  console.error(`Run: pnpm harness:dag:input ${taskId}`);
  process.exit(2);
}

const input = JSON.parse(fs.readFileSync(inputFile,"utf8"));
const policy = JSON.parse(fs.readFileSync(".codex/orchestration/dag-policy.json","utf8"));
const catalog = JSON.parse(fs.readFileSync(".codex/orchestration/node-catalog.json","utf8")).nodes;

const workflow = compileDag(input, policy, { nodes: catalog });
const validation = validateWorkflow(workflow, { catalog: { nodes: catalog }, requiredNodes: ["planner", "review", "pr"] });
if (!validation.valid) {
  console.error("Compiled DAG validation FAILED");
  for (const error of validation.errors) console.error(`- ${error.message}`);
  process.exit(1);
}

const out = `.codex/orchestration/runs/${taskId}/compiled-workflow.json`;
fs.mkdirSync(`.codex/orchestration/runs/${taskId}`,{recursive:true});
fs.writeFileSync(out, JSON.stringify(workflow,null,2)+"\n");

console.log(JSON.stringify({
  taskId,
  selected: workflow.nodes.map(n => n.id),
  output: out
},null,2));
