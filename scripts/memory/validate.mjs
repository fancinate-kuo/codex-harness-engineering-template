import fs from "node:fs";

const index=JSON.parse(fs.readFileSync(".codex/memory/index.json","utf8"));
const seen=new Set();
const errors=[];

for(const item of index.records ?? []){
  if(seen.has(item.id)) errors.push(`Duplicate memory id: ${item.id}`);
  seen.add(item.id);

  if(!fs.existsSync(item.file)){
    errors.push(`Missing memory file: ${item.file}`);
    continue;
  }

  const r=JSON.parse(fs.readFileSync(item.file,"utf8"));
  for(const key of ["id","kind","title","content","createdAt","source","confidence","status"]){
    if(r[key]===undefined || r[key]===null) errors.push(`${item.file}: missing ${key}`);
  }
}

if(errors.length){
  console.error("Memory validation FAILED");
  for(const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log(`Memory validation PASS. Records: ${(index.records??[]).length}`);
