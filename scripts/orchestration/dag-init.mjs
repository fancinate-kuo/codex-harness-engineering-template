import fs from "node:fs";

const taskId=process.argv[2];
if(!taskId){console.log("Usage: pnpm harness:dag:init TASK-001");process.exit(0);}

const wfFile=`.codex/orchestration/runs/${taskId}/compiled-workflow.json`;
if(!fs.existsSync(wfFile)){console.error(`Missing ${wfFile}`);process.exit(2);}
const wf=JSON.parse(fs.readFileSync(wfFile,"utf8"));

const nodes={};
for(const n of wf.nodes){
  nodes[n.id]={status:"pending",retryCount:0,worktree:null,branch:null,threadId:null,requestId:null,attemptId:null,active:false,startedAt:null,finishedAt:null};
}

const state={
  version:2,
  taskId,
  workflow:wf.name,
  dynamic:true,
  createdAt:new Date().toISOString(),
  updatedAt:new Date().toISOString(),
  nodes
};

fs.writeFileSync(`.codex/orchestration/runs/${taskId}/dag.json`,JSON.stringify(state,null,2)+"\n");
console.log(`Dynamic DAG initialized: ${taskId}`);
