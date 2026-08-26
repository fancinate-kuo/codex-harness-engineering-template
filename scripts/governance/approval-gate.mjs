import fs from "node:fs";

const taskId=process.argv[2];
if(!taskId){
  console.log("Usage: pnpm harness:approval:gate TASK-001");
  process.exit(0);
}

const shared=`.codex/orchestration/shared/${taskId}`;
const policyFile=`${shared}/policy-decision.json`;

if(!fs.existsSync(policyFile)){
  console.error(`Missing policy decision: ${policyFile}`);
  process.exit(2);
}

const p=JSON.parse(fs.readFileSync(policyFile,"utf8"));

if(["auto","auto-with-gates"].includes(p.automationDecision)){
  console.log(`Approval Gate PASS: ${p.automationDecision}`);
  process.exit(0);
}

const approvalFile=`${shared}/approval.json`;
if(!fs.existsSync(approvalFile)){
  console.error("Approval Gate BLOCKED: approval request missing");
  process.exit(3);
}

const a=JSON.parse(fs.readFileSync(approvalFile,"utf8"));

if(a.decision==="approved"){
  console.log("Approval Gate PASS: approved");
  process.exit(0);
}
if(a.decision==="rejected"){
  console.error("Approval Gate FAILED: rejected");
  process.exit(4);
}

console.error("Approval Gate BLOCKED: pending");
process.exit(3);
