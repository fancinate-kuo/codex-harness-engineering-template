import fs from "node:fs";
import { resolveRuntimeStoreMode } from "../persistence/lib/runtime-store.mjs";
import { decidePostgresApproval } from "../persistence/lib/approval.mjs";

const taskId=process.argv[2];
const decision=process.argv[3];
const decidedBy=process.argv[4] || "human";
const reason=process.argv.slice(5).join(" ");

if(!taskId || !["approved","rejected"].includes(decision)){
  console.log('Usage: pnpm harness:approval:decide TASK-001 approved human "reason"');
  process.exit(0);
}

async function main() {
  if (resolveRuntimeStoreMode() === "postgres") {
    const result = await decidePostgresApproval(taskId, decision, decidedBy, reason);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const file=`.codex/orchestration/shared/${taskId}/approval.json`;
  if(!fs.existsSync(file)) throw new Error(`Missing approval request: ${file}`);

  const a=JSON.parse(fs.readFileSync(file,"utf8"));
  a.decision=decision;
  a.decidedAt=new Date().toISOString();
  a.decidedBy=decidedBy;
  a.reason=reason || a.reason;

  fs.writeFileSync(file,JSON.stringify(a,null,2)+"\n");
  console.log(JSON.stringify(a,null,2));
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
