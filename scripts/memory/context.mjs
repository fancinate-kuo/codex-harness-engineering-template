import fs from "node:fs";

const taskId=process.argv[2];
if(!taskId){
  console.log("Usage: pnpm harness:memory:context TASK-001");
  process.exit(0);
}

const shared=`.codex/orchestration/shared/${taskId}`;
const files=["dag-input.json","impact.json","plan.json"];
let terms=[];

for(const name of files){
  const f=`${shared}/${name}`;
  if(!fs.existsSync(f)) continue;
  const text=fs.readFileSync(f,"utf8");
  const matches=text.match(/[A-Za-z0-9_.:/-]{4,}/g)??[];
  terms.push(...matches);
}

terms=[...new Set(terms)].slice(0,40);
const index=JSON.parse(fs.readFileSync(".codex/memory/index.json","utf8"));
const results=[];

for(const item of index.records??[]){
  if(item.status!=="active" || !fs.existsSync(item.file)) continue;
  const r=JSON.parse(fs.readFileSync(item.file,"utf8"));
  const hay=JSON.stringify(r).toLowerCase();
  const score=terms.reduce((n,t)=>n+(hay.includes(t.toLowerCase())?1:0),0);
  if(score>0) results.push({score,record:r});
}

results.sort((a,b)=>b.score-a.score);

fs.mkdirSync(shared,{recursive:true});
fs.writeFileSync(`${shared}/memory-context.json`,JSON.stringify({
  taskId,
  generatedAt:new Date().toISOString(),
  matches:results.slice(0,10)
},null,2)+"\n");

console.log(JSON.stringify(results.slice(0,10),null,2));
