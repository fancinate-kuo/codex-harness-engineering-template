import fs from "node:fs";

const q=process.argv.slice(2).join(" ").trim().toLowerCase();
if(!q){
  console.log('Usage: pnpm harness:memory:query "forum cross module"');
  process.exit(0);
}

const index=JSON.parse(fs.readFileSync(".codex/memory/index.json","utf8"));
const results=[];

for(const item of index.records ?? []){
  if(item.status!=="active") continue;
  if(!fs.existsSync(item.file)) continue;
  const r=JSON.parse(fs.readFileSync(item.file,"utf8"));
  const hay=[
    r.id,r.kind,r.title,r.content,
    ...(r.tags??[]),
    r.scope?.featureId??"",
    r.scope?.moduleId??"",
    ...(r.scope?.paths??[])
  ].join(" ").toLowerCase();

  if(hay.includes(q) || q.split(/\s+/).every(t=>hay.includes(t))){
    results.push(r);
  }
}

console.log(JSON.stringify(results,null,2));
