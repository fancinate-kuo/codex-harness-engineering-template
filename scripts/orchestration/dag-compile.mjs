import fs from "node:fs";

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

const s = input.signals ?? {};
let selected = new Set(policy.defaults.always ?? []);

if (s.docsOnly) {
  selected = new Set(["planner","docs","review","pr"]);
} else {
  if (s.backendChange) selected.add("backend");
  if (s.frontendChange) selected.add("frontend");
  if (s.databaseChange) selected.add("migration");
  if (s.uiBehaviorChange) selected.add("playwright");
  if (s.securitySensitive) selected.add("security-review");

  const mutable = ["backend","frontend","migration"].filter(x => selected.has(x));
  if (mutable.length > 0 && policy.defaults.testForCodeChanges) selected.add("test");
  if (mutable.length > 1 && policy.defaults.integrationForParallelMutableBranches) selected.add("integration");

  for (const x of policy.riskRules?.[s.risk] ?? []) selected.add(x);
}

function deps(id) {
  if (id === "planner") return [];
  if (id === "impact") return selected.has("planner") ? ["planner"] : [];
  if (["backend","frontend","migration","docs"].includes(id)) return selected.has("impact") ? ["impact"] : ["planner"];
  if (id === "integration") return ["backend","frontend","migration"].filter(x => selected.has(x));
  if (id === "test") return selected.has("integration")
    ? ["integration"]
    : ["backend","frontend","migration"].filter(x => selected.has(x));
  if (id === "playwright") return selected.has("integration")
    ? ["integration"]
    : ["frontend"].filter(x => selected.has(x));
  if (id === "security-review") return selected.has("integration")
    ? ["integration"]
    : ["backend","frontend","migration"].filter(x => selected.has(x));
  if (id === "review") {
    const prev = ["test","playwright","security-review"].filter(x => selected.has(x));
    if (prev.length) return prev;
    if (selected.has("integration")) return ["integration"];
    return ["backend","frontend","migration","docs"].filter(x => selected.has(x));
  }
  if (id === "pr") return selected.has("review") ? ["review"] : [];
  return [];
}

const preferredOrder = [
  "planner","impact","backend","frontend","migration","docs","integration",
  "test","playwright","security-review","review","pr"
];

const nodes = preferredOrder
  .filter(id => selected.has(id))
  .map(id => {
    const base = catalog[id];
    if (!base) throw new Error(`Node catalog missing: ${id}`);
    return { id, ...base, dependsOn: deps(id) };
  });

const workflow = {
  version: 1,
  generated: true,
  name: `compiled-${taskId}`,
  taskId,
  compiledAt: new Date().toISOString(),
  signals: s,
  nodes
};

// JS uses lowercase true
workflow.generated = true;

const out = `.codex/orchestration/runs/${taskId}/compiled-workflow.json`;
fs.mkdirSync(`.codex/orchestration/runs/${taskId}`,{recursive:true});
fs.writeFileSync(out, JSON.stringify(workflow,null,2)+"\n");

console.log(JSON.stringify({
  taskId,
  selected: nodes.map(n => n.id),
  output: out
},null,2));
