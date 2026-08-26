import fs from "node:fs";

const taskId=process.argv[2];
if(!taskId){
  console.log("Usage: pnpm harness:memory:from-handoff TASK-001");
  process.exit(0);
}

const dir=".codex/handoffs";
if(!fs.existsSync(dir)){
  console.error("No handoff directory");
  process.exit(2);
}

const candidates=fs.readdirSync(dir)
  .filter(f=>f.includes(taskId) && f.endsWith(".json"))
  .sort();

if(!candidates.length){
  console.error(`No handoff found for ${taskId}`);
  process.exit(2);
}

const file=`${dir}/${candidates.at(-1)}`;
const h=JSON.parse(fs.readFileSync(file,"utf8"));

const out={
  taskId,
  candidates:{
    decisions:h.decisions??[],
    risks:h.risks??[],
    remaining:h.remaining??[]
  },
  instruction:"Review these candidates before promoting them into durable repository memory."
};

console.log(JSON.stringify(out,null,2));
