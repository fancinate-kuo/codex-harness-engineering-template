import fs from "node:fs";
import { runnableNodes, hasFailedDependency } from "./lib/dag.mjs";
import { canAllocate } from "./lib/pool.mjs";
import { evaluateCondition } from "./lib/parallel-conditions.mjs";
import { ensureNodeWorktree } from "./lib/node-worktree.mjs";

const taskId=process.argv[2];
if(!taskId){console.log("Usage: pnpm harness:parallel:run TASK-001");process.exit(0);}
const wf=JSON.parse(fs.readFileSync(".codex/orchestration/parallel-workflow.json","utf8"));
const pool=JSON.parse(fs.readFileSync(".codex/orchestration/agent-pool.json","utf8"));
const f=`.codex/orchestration/runs/${taskId}/dag.json`;
if(!fs.existsSync(f)){console.error(`Missing DAG state. Run: pnpm harness:parallel:init ${taskId}`);process.exit(2);}
const s=JSON.parse(fs.readFileSync(f,"utf8"));

for(const n of wf.nodes){
  const ns=s.nodes[n.id];
  if(["passed","failed","blocked","skipped","running"].includes(ns.status)) continue;
  if(hasFailedDependency(n,s)){ns.status="blocked";continue;}
  if(n.conditional && !evaluateCondition(taskId,n.conditional)){ns.status="skipped";ns.finishedAt=new Date().toISOString();}
}

const started=[];
for(const n of runnableNodes(wf,s)){
  if(!canAllocate(n,s,wf,pool)) continue;
  const ns=s.nodes[n.id];
  if(n.mutable){
    try{ns.worktree=ensureNodeWorktree(taskId,n.id);}
    catch(e){ns.status="failed";ns.finishedAt=new Date().toISOString();continue;}
  }
  ns.status="running"; ns.startedAt=new Date().toISOString();
  const req={taskId,nodeId:n.id,agent:n.agent,role:n.role??null,mutable:n.mutable,worktree:ns.worktree,dependsOn:n.dependsOn??[],expectedOutputs:n.produces??[],instructions:`.codex/agents/${n.agent}.md`,createdAt:new Date().toISOString()};
  const d=".codex/orchestration/requests"; fs.mkdirSync(d,{recursive:true});
  const rf=`${d}/${taskId}__${n.id}.json`; fs.writeFileSync(rf,JSON.stringify(req,null,2)+"\n");
  started.push({node:n.id,agent:n.agent,request:rf,worktree:ns.worktree});
}
s.updatedAt=new Date().toISOString(); fs.writeFileSync(f,JSON.stringify(s,null,2)+"\n");
console.log(JSON.stringify({taskId,started,state:Object.fromEntries(Object.entries(s.nodes).map(([k,v])=>[k,v.status]))},null,2));
