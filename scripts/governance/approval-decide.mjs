import fs from "node:fs";

const taskId=process.argv[2];
const decision=process.argv[3];
const decidedBy=process.argv[4] || "human";
const reason=process.argv.slice(5).join(" ");

if(!taskId || !["approved","rejected"].includes(decision)){
  console.log('Usage: pnpm harness:approval:decide TASK-001 approved human "reason"');
  process.exit(0);
}

const file=`.codex/orchestration/shared/${taskId}/approval.json`;
if(!fs.existsSync(file)){
  console.error(`Missing approval request: ${file}`);
  process.exit(2);
}

const a=JSON.parse(fs.readFileSync(file,"utf8"));
a.decision=decision;
a.decidedAt=new Date().toISOString();
a.decidedBy=decidedBy;
a.reason=reason || a.reason;

fs.writeFileSync(file,JSON.stringify(a,null,2)+"\n");
console.log(JSON.stringify(a,null,2));
