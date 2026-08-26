import fs from "node:fs";

const benchId=process.argv[2];
if(!benchId){
  console.log("Usage: pnpm harness:eval:prepare BENCH-001");
  process.exit(0);
}

const suite=JSON.parse(fs.readFileSync(".codex/evaluation/suite.json","utf8"));
const file=(suite.benchmarks??[]).find(f=>f.includes(benchId));

if(!file){
  console.error(`Benchmark not found: ${benchId}`);
  process.exit(2);
}

const b=JSON.parse(fs.readFileSync(file,"utf8"));
const taskId=`EVAL-${benchId}`;

const queueFile=".codex/orchestration/queue/tasks.json";
const queue=JSON.parse(fs.readFileSync(queueFile,"utf8"));

if(!queue.tasks.some(t=>t.id===taskId)){
  const now=new Date().toISOString();
  queue.tasks.push({
    id:taskId,
    title:b.title,
    requirementId:null,
    featureId:null,
    state:"proposed",
    priority:"normal",
    assignedAgent:null,
    worktree:null,
    createdAt:now,
    updatedAt:now
  });
  fs.writeFileSync(queueFile,JSON.stringify(queue,null,2)+"\n");
}

const shared=`.codex/orchestration/shared/${taskId}`;
fs.mkdirSync(shared,{recursive:true});

fs.writeFileSync(`${shared}/dag-input.json`,JSON.stringify({
  taskId,
  requirementId:null,
  featureId:null,
  signals:b.input.signals
},null,2)+"\n");

fs.writeFileSync(`${shared}/benchmark.json`,JSON.stringify(b,null,2)+"\n");

console.log(JSON.stringify({benchmark:benchId,taskId,prepared:true},null,2));
