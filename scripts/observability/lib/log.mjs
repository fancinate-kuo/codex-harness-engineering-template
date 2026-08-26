import fs from "node:fs";
import path from "node:path";

function dir(taskId) {
  const d=`.codex/observability/tasks/${taskId}`;
  fs.mkdirSync(d,{recursive:true});
  return d;
}

export function appendJsonl(file, value) {
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.appendFileSync(file,JSON.stringify(value)+"\n");
}

export function metric(taskId, event) {
  appendJsonl(`${dir(taskId)}/metrics.jsonl`,{
    timestamp:new Date().toISOString(),
    taskId,
    nodeId:null,
    agent:null,
    durationMs:null,
    status:null,
    value:null,
    metadata:{},
    ...event
  });
}

export function audit(taskId, event) {
  appendJsonl(`${dir(taskId)}/audit.jsonl`,{
    timestamp:new Date().toISOString(),
    taskId,
    actor:"orchestrator",
    action:"unknown",
    reason:null,
    evidence:[],
    before:null,
    after:null,
    ...event
  });
}
