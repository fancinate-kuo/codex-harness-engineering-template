import fs from "node:fs";

const taskId = process.argv[2];
if (!taskId) {
  console.log("Usage: pnpm harness:dag:feedback TASK-001");
  process.exit(0);
}

const wfFile = `.codex/orchestration/runs/${taskId}/compiled-workflow.json`;
if (!fs.existsSync(wfFile)) {
  console.error(`Missing ${wfFile}`);
  process.exit(2);
}

const wf = JSON.parse(fs.readFileSync(wfFile,"utf8"));
const policy = JSON.parse(fs.readFileSync(".codex/orchestration/feedback-policy.json","utf8"));
const feedbackCatalog = JSON.parse(fs.readFileSync(".codex/orchestration/node-catalog-feedback.json","utf8")).nodes;

const dir = `.codex/orchestration/shared/${taskId}/feedback`;
if (!fs.existsSync(dir)) {
  console.log("No feedback to apply.");
  process.exit(0);
}

const failed = fs.readdirSync(dir)
  .filter(f=>f.endsWith(".json"))
  .map(f=>JSON.parse(fs.readFileSync(`${dir}/${f}`,"utf8")))
  .filter(e=>e.status==="failed" && e.classification);

const add = new Set();

for (const e of failed) {
  const rule = policy.classifications[e.classification];
  if (rule?.action === "replan") {
    for (const n of rule.addNodes ?? []) add.add(n);
  }
}

const byId = Object.fromEntries((wf.nodes ?? []).map(n=>[n.id,n]));

function lastVerificationNodes() {
  return ["test","playwright","security-review","review"].filter(id=>byId[id]);
}

for (const id of add) {
  if (byId[id]) continue;

  const base = feedbackCatalog[id];
  if (!base) continue;

  let dependsOn = [];
  if (id === "impact-refresh") {
    dependsOn = ["impact"].filter(x=>byId[x]);
  } else if (id === "fix" || id === "security-fix" || id === "migration-fix") {
    dependsOn = lastVerificationNodes();
    if (!dependsOn.length) dependsOn = ["integration","backend","frontend","migration"].filter(x=>byId[x]);
  }

  const node = {id,...base,dependsOn};
  wf.nodes.push(node);
  byId[id] = node;
}

if (byId["review"]) {
  const fixNodes = ["fix","security-fix","migration-fix","impact-refresh"].filter(x=>byId[x]);
  if (fixNodes.length) {
    byId["review"].dependsOn = [...new Set([...(byId["review"].dependsOn ?? []),...fixNodes])];
  }
}

if (byId["pr"]) {
  byId["pr"].dependsOn = ["review"];
}

wf.recompiledAt = new Date().toISOString();
wf.feedbackApplied = [...add];

fs.writeFileSync(wfFile,JSON.stringify(wf,null,2)+"\n");
console.log(JSON.stringify({taskId,added:[...add],workflow:wfFile},null,2));
