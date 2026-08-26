import fs from "node:fs";
import { audit, metric } from "./lib/log.mjs";

const taskId=process.argv[2];
if(!taskId){console.log("Usage: pnpm harness:observe:dag TASK-001");process.exit(0);}

const wfFile=`.codex/orchestration/runs/${taskId}/compiled-workflow.json`;
const stateFile=`.codex/orchestration/runs/${taskId}/dag.json`;

const wf=fs.existsSync(wfFile)?JSON.parse(fs.readFileSync(wfFile,"utf8")):null;
const state=fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile,"utf8")):null;

if(wf){
  metric(taskId,{type:"dag_node_count",value:(wf.nodes??[]).length});
  audit(taskId,{action:"dag_snapshot",after:{workflow:wf.name,nodes:(wf.nodes??[]).map(n=>n.id)}});
}

if(state){
  const running=Object.values(state.nodes??{}).filter(n=>n.status==="running").length;
  metric(taskId,{type:"parallelism_current",value:running});
}

console.log("DAG observability snapshot recorded.");
