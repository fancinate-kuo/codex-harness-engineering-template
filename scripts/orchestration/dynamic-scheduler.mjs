import fs from "node:fs";
import { runnableNodes, hasFailedDependency } from "./lib/dag.mjs";
import { canAllocate } from "./lib/pool.mjs";
import { ensureNodeWorktree } from "./lib/node-worktree.mjs";

const taskId=process.argv[2];
if(!taskId){console.log("Usage: pnpm harness:dag:run TASK-001");process.exit(0);}

const wfFile=`.codex/orchestration/runs/${taskId}/compiled-workflow.json`;
const stateFile=`.codex/orchestration/runs/${taskId}/dag.json`;

if(!fs.existsSync(wfFile)||!fs.existsSync(stateFile)){
  console.error("Missing compiled workflow or DAG state");
  process.exit(2);
}

const wf=JSON.parse(fs.readFileSync(wfFile,"utf8"));
const pool=JSON.parse(fs.readFileSync(".codex/orchestration/agent-pool.json","utf8"));
const s=JSON.parse(fs.readFileSync(stateFile,"utf8"));

for(const n of wf.nodes){
  const ns=s.nodes[n.id];
  if(["passed","failed","blocked","skipped","running"].includes(ns.status)) continue;
  if(hasFailedDependency(n,s)){ns.status="blocked";}
}

const started=[];
for(const n of runnableNodes(wf,s)){
  if(!canAllocate(n,s,wf,pool)) continue;
  const ns=s.nodes[n.id];

  if(n.mutable){
    try{ns.worktree=ensureNodeWorktree(taskId,n.id);}
    catch(e){
      ns.status="failed";
      ns.finishedAt=new Date().toISOString();
      continue;
    }
  }

  ns.status="running";
  ns.startedAt=new Date().toISOString();

  const req={
    taskId,
    nodeId:n.id,
    agent:n.agent,
    role:n.role??null,
    mutable:n.mutable,
    worktree:ns.worktree,
    dependsOn:n.dependsOn??[],
    expectedOutputs:n.produces??[],
    instructions:`.codex/agents/${n.agent}.md`,
    compiledWorkflow:wf.name,
    createdAt:new Date().toISOString()
  };

  const dir=".codex/orchestration/requests";
  fs.mkdirSync(dir,{recursive:true});
  const rf=`${dir}/${taskId}__${n.id}.json`;
  fs.writeFileSync(rf,JSON.stringify(req,null,2)+"\n");

  started.push({node:n.id,agent:n.agent,request:rf,worktree:ns.worktree});
}

s.updatedAt=new Date().toISOString();
fs.writeFileSync(stateFile,JSON.stringify(s,null,2)+"\n");

console.log(JSON.stringify({
  taskId,
  workflow:wf.name,
  started,
  state:Object.fromEntries(Object.entries(s.nodes).map(([k,v])=>[k,v.status]))
},null,2));
