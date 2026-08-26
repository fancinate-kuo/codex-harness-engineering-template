import fs from "node:fs";
import path from "node:path";

const taskId = process.argv[2];
if (!taskId) {
  console.log("Usage: pnpm harness:dag:input TASK-001");
  process.exit(0);
}

const queue = JSON.parse(fs.readFileSync(".codex/orchestration/queue/tasks.json","utf8"));
const task = queue.tasks.find(t => t.id === taskId);
if (!task) {
  console.error(`Task not found: ${taskId}`);
  process.exit(2);
}

let business = null;
if (fs.existsSync("graph/business/business-graph.json")) {
  business = JSON.parse(fs.readFileSync("graph/business/business-graph.json","utf8"));
}

let feature = null;
if (task.featureId && business) {
  feature = (business.features ?? []).find(f => f.id === task.featureId) ?? null;
}

const impactFile = `.codex/orchestration/shared/${taskId}/impact.json`;
const impact = fs.existsSync(impactFile)
  ? JSON.parse(fs.readFileSync(impactFile,"utf8"))
  : null;

const signals = {
  backendChange: Boolean(
    impact?.backendChange ??
    impact?.backend ??
    feature?.module
  ),
  frontendChange: Boolean(
    impact?.frontendChange ??
    impact?.frontend ??
    feature?.frontend
  ),
  databaseChange: Boolean(
    impact?.databaseChangeRequired ??
    (impact?.tables ?? []).length ??
    (feature?.tables ?? []).length
  ),
  uiBehaviorChange: Boolean(
    impact?.uiBehaviorChange ??
    impact?.playwrightRequired ??
    false
  ),
  securitySensitive: Boolean(
    impact?.securitySensitive ??
    impact?.authChange ??
    impact?.paymentChange ??
    false
  ),
  docsOnly: Boolean(
    impact?.docsOnly ??
    false
  ),
  risk: impact?.risk ?? feature?.risk ?? "unknown"
};

const result = {
  taskId,
  requirementId: task.requirementId ?? null,
  featureId: task.featureId ?? null,
  signals
};

const dir = `.codex/orchestration/shared/${taskId}`;
fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(`${dir}/dag-input.json`, JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify(result,null,2));
