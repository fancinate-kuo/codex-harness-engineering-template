import fs from "node:fs";
const task=process.argv[2], nodeId=process.argv[3], status=process.argv[4]||"passed";
if(!task||!nodeId){console.log("Usage: pnpm harness:parallel:complete TASK-001 backend passed");process.exit(0);}
const f=`.codex/orchestration/runs/${task}/dag.json`, s=JSON.parse(fs.readFileSync(f,"utf8"));
if(!s.nodes[nodeId]){console.error(`Unknown node: ${nodeId}`);process.exit(2);}
s.nodes[nodeId].status=status; s.nodes[nodeId].finishedAt=new Date().toISOString();
if(status==="failed") s.nodes[nodeId].retryCount=(s.nodes[nodeId].retryCount??0)+1;
s.updatedAt=new Date().toISOString(); fs.writeFileSync(f,JSON.stringify(s,null,2)+"\n");
console.log(`${task}/${nodeId}: ${status}`);
