import fs from "node:fs";

const taskId=process.argv[2];
if(!taskId){console.log("Usage: pnpm harness:feedback:reset TASK-001");process.exit(0);}

const wfFile=`.codex/orchestration/runs/${taskId}/compiled-workflow.json`;
const stateFile=`.codex/orchestration/runs/${taskId}/dag.json`;

const wf=JSON.parse(fs.readFileSync(wfFile,"utf8"));
const state=JSON.parse(fs.readFileSync(stateFile,"utf8"));

for(const n of wf.nodes){
  if(!state.nodes[n.id]){
    state.nodes[n.id]={
      status:"pending",
      retryCount:0,
      worktree:null,
      threadId:null,
      startedAt:null,
      finishedAt:null
    };
  }
}

for(const id of ["review","pr"]){
  if(state.nodes[id] && ["passed","blocked","failed"].includes(state.nodes[id].status)){
    state.nodes[id].status="pending";
    state.nodes[id].startedAt=null;
    state.nodes[id].finishedAt=null;
  }
}

state.updatedAt=new Date().toISOString();
fs.writeFileSync(stateFile,JSON.stringify(state,null,2)+"\n");
console.log(`Feedback DAG state synchronized: ${taskId}`);
