import fs from "node:fs";
const taskId=process.argv[2]; if(!taskId){console.log("Usage: pnpm harness:parallel:init TASK-001");process.exit(0);}
const wf=JSON.parse(fs.readFileSync(".codex/orchestration/parallel-workflow.json","utf8"));
const nodes={}; for(const n of wf.nodes) nodes[n.id]={status:"pending",retryCount:0,worktree:null,threadId:null,startedAt:null,finishedAt:null};
const state={version:1,taskId,workflow:wf.name,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),nodes};
const dir=`.codex/orchestration/runs/${taskId}`; fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(`${dir}/dag.json`,JSON.stringify(state,null,2)+"\n");
fs.mkdirSync(`.codex/orchestration/shared/${taskId}`,{recursive:true});
console.log(`Parallel DAG initialized: ${taskId}`);
