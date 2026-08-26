import fs from "node:fs";
import { validateWorkflow } from "./lib/workflow.mjs";

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
const catalog = JSON.parse(fs.readFileSync(".codex/orchestration/node-catalog.json", "utf8"));
const pool = JSON.parse(fs.readFileSync(".codex/orchestration/agent-pool.json", "utf8"));
const validation = validateWorkflow(wf, { catalog, pool, requiredNodes: ["planner", "pr", "review"] });

if (!validation.valid) {
  console.error("Compiled DAG validation FAILED");
  for (const error of validation.errors) console.error(`- ${error.message}`);
  process.exit(1);
}

console.log("Compiled DAG validation PASS");
console.log(`Nodes: ${(wf.nodes ?? []).map(node => node.id).join(", ")}`);
