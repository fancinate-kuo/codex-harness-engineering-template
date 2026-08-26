import { audit } from "./lib/log.mjs";

const taskId=process.argv[2], actor=process.argv[3], action=process.argv[4];
const reason=process.argv.slice(5).join(" ");

if(!taskId||!actor||!action){
  console.log('Usage: pnpm harness:audit TASK-001 review-agent "replan" "architecture violation"');
  process.exit(0);
}

audit(taskId,{actor,action,reason:reason||null});
console.log(`audit recorded: ${taskId} ${action}`);
