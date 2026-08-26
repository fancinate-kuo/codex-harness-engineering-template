import fs from "node:fs";

const taskId=process.argv[2];
const nodeId=process.argv[3] || null;
const inputTokens=Number(process.argv[4] || 0);
const outputTokens=Number(process.argv[5] || 0);
const estimatedCostUsd=process.argv[6] ? Number(process.argv[6]) : null;

if(!taskId){
  console.log("Usage: pnpm harness:token-cost TASK-001 backend 1200 450 0.012");
  process.exit(0);
}

const dir=`.codex/observability/tasks/${taskId}`;
fs.mkdirSync(dir,{recursive:true});
const file=`${dir}/token-cost.jsonl`;

const event={
  taskId,
  nodeId,
  agent:null,
  model:null,
  inputTokens,
  outputTokens,
  cachedInputTokens:0,
  estimatedCostUsd,
  timestamp:new Date().toISOString()
};

fs.appendFileSync(file,JSON.stringify(event)+"\n");
console.log(`token/cost recorded for ${taskId}`);
