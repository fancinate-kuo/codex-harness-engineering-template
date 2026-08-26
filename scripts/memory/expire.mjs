import fs from "node:fs";

const id=process.argv[2];
if(!id){
  console.log("Usage: pnpm harness:memory:expire <memory-id>");
  process.exit(0);
}

const indexFile=".codex/memory/index.json";
const index=JSON.parse(fs.readFileSync(indexFile,"utf8"));
const item=(index.records??[]).find(x=>x.id===id);

if(!item){
  console.error(`Memory not found: ${id}`);
  process.exit(2);
}

const record=JSON.parse(fs.readFileSync(item.file,"utf8"));
record.status="expired";
record.updatedAt=new Date().toISOString();
fs.writeFileSync(item.file,JSON.stringify(record,null,2)+"\n");

item.status="expired";
fs.writeFileSync(indexFile,JSON.stringify(index,null,2)+"\n");

console.log(`Expired memory: ${id}`);
