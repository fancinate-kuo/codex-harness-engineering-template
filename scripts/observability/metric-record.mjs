import { metric } from "./lib/log.mjs";

const taskId=process.argv[2], type=process.argv[3], value=process.argv[4];
if(!taskId||!type){
  console.log("Usage: pnpm harness:metric TASK-001 retry_count 1");
  process.exit(0);
}

let parsed=value;
if(value==="true") parsed=true;
else if(value==="false") parsed=false;
else if(value!==undefined && !Number.isNaN(Number(value))) parsed=Number(value);

metric(taskId,{type,value:parsed});
console.log(`metric recorded: ${taskId} ${type}`);
