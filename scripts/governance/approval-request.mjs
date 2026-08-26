import fs from "node:fs";

const taskId=process.argv[2];
if(!taskId){
  console.log("Usage: pnpm harness:approval:request TASK-001");
  process.exit(0);
}

const shared=`.codex/orchestration/shared/${taskId}`;
const policyFile=`${shared}/policy-decision.json`;

if(!fs.existsSync(policyFile)){
  console.error(`Missing ${policyFile}`);
  process.exit(2);
}

const policy=JSON.parse(fs.readFileSync(policyFile,"utf8"));

const approval={
  taskId,
  decision:"pending",
  requestedAt:new Date().toISOString(),
  decidedAt:null,
  decidedBy:null,
  reason:policy.approvalReasons?.join(", ") || policy.automationDecision,
  scope:policy.approvalReasons ?? []
};

fs.writeFileSync(`${shared}/approval.json`,JSON.stringify(approval,null,2)+"\n");
console.log(JSON.stringify(approval,null,2));
