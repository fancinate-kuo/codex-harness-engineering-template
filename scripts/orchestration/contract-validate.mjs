import fs from "node:fs";
import path from "node:path";
import { validateInvocationRequest, validateStageResult } from "./lib/results.mjs";
import { compileDag, validateWorkflow } from "./lib/workflow.mjs";

const root = process.cwd();
const catalog = readJson(".codex/orchestration/node-catalog.json");
const policy = readJson(".codex/orchestration/dag-policy.json");
const pool = readJson(".codex/orchestration/agent-pool.json");

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.resolve(root, file), "utf8"));
}

function fail(errors) {
  console.error("Orchestration contract validation FAILED");
  for (const error of errors) console.error(`- ${error.message ?? error}`);
  process.exitCode = 1;
}

function validateStaticConfig() {
  const errors = [];
  const limits = pool.limits ?? {};
  if (limits.global !== 4 || limits.mutable !== 2 || limits.readOnly !== 4) errors.push({ message: "agent-pool.json must define global=4, mutable=2, readOnly=4" });
  if (policy.poolSource !== "agent-pool.json") errors.push({ message: "policies.json must reference agent-pool.json as its only pool source" });
  for (const profile of [
    { backendChange: true },
    { backendChange: true, frontendChange: true, databaseChange: true, uiBehaviorChange: true, securitySensitive: true, risk: "high" },
    { docsOnly: true },
    { securitySensitive: true, risk: "critical" }
  ]) {
    const workflow = compileDag({ taskId: `CONFIG-${Object.keys(profile).join("-")}`, signals: profile }, policy, catalog);
    errors.push(...validateWorkflow(workflow, { catalog, pool, requiredNodes: ["planner", "review", "pr"] }).errors);
  }
  return errors;
}

const [kind = "static", file, workflowFile, stateFile] = process.argv.slice(2);
if (kind === "static") {
  const errors = validateStaticConfig();
  if (errors.length > 0) fail(errors);
  else console.log("Orchestration static contracts: PASS");
} else if (kind === "workflow") {
  const workflow = readJson(file);
  const result = validateWorkflow(workflow, { catalog, pool, requiredNodes: ["planner", "review", "pr"] });
  if (!result.valid) fail(result.errors);
  else console.log(`Workflow contract: PASS (${workflow.name})`);
} else if (kind === "request") {
  const request = readJson(file);
  const workflow = workflowFile ? readJson(workflowFile) : null;
  const result = validateInvocationRequest(request, { workflow });
  if (!result.valid) fail(result.errors);
  else console.log(`Invocation request contract: PASS (${request.requestId})`);
} else if (kind === "result") {
  const resultArtifact = readJson(file);
  const workflow = readJson(workflowFile);
  const state = stateFile ? readJson(stateFile) : null;
  const result = validateStageResult(resultArtifact, {
    workflow,
    state,
    artifactExists: artifactPath => fs.existsSync(path.resolve(root, artifactPath))
  });
  if (!result.valid) fail(result.errors);
  else console.log(`Stage result contract: PASS (${resultArtifact.requestId})`);
} else {
  fail([{ message: `Unknown contract type: ${kind}` }]);
}
