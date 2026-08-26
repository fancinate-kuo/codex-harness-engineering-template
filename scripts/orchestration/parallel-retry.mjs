import fs from "node:fs";
const task=process.argv[2], nodeId=process.argv[3];
if(!task||!nodeId){console.log("Usage: pnpm harness:parallel:retry TASK-001 backend");process.exit(0);}
const policy=JSON.parse(fs.readFileSync(".codex/orchestration/policies.json","utf8")), max=policy.maxAutomaticRetriesPerStage??2;
const f=`.codex/orchestration/runs/${task}/dag.json`, s=JSON.parse(fs.readFileSync(f,"utf8")), n=s.nodes[nodeId];
if(!n){console.error(`Unknown node: ${nodeId}`);process.exit(2);}
if(n.retryCount>=max){n.status="blocked";fs.writeFileSync(f,JSON.stringify(s,null,2)+"\n");console.error(`Retry limit reached for ${nodeId}`);process.exit(3);}
n.status="pending"; n.startedAt=null; n.finishedAt=null; fs.writeFileSync(f,JSON.stringify(s,null,2)+"\n");
console.log(`Retry scheduled: ${task}/${nodeId}`);
