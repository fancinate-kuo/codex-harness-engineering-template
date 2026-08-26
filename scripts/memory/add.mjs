import fs from "node:fs";
import path from "node:path";

const kind=process.argv[2];
const id=process.argv[3];
const title=process.argv.slice(4).join(" ");

if(!kind||!id||!title){
  console.log('Usage: pnpm harness:memory:add decision forum-events "Use domain events for forum cross-module communication"');
  process.exit(0);
}

const policy=JSON.parse(fs.readFileSync(".codex/memory/policy.json","utf8"));
if(!policy.writeRules.allowedKinds.includes(kind)){
  console.error(`Unsupported memory kind: ${kind}`);
  process.exit(2);
}

const now=new Date().toISOString();
const record={
  id,
  kind,
  title,
  content:"",
  tags:[],
  scope:{featureId:null,moduleId:null,paths:[]},
  source:{type:"manual",ref:"pending"},
  confidence:"medium",
  status:"active",
  createdAt:now,
  updatedAt:now,
  expiresAt:null,
  supersedes:null
};

const dir=".codex/memory/records";
fs.mkdirSync(dir,{recursive:true});
const file=`${dir}/${kind}__${id}.json`;
if(fs.existsSync(file)){
  console.error(`Memory already exists: ${file}`);
  process.exit(3);
}
fs.writeFileSync(file,JSON.stringify(record,null,2)+"\n");

const indexFile=".codex/memory/index.json";
const index=JSON.parse(fs.readFileSync(indexFile,"utf8"));
index.records.push({id,kind,file,status:"active",title});
fs.writeFileSync(indexFile,JSON.stringify(index,null,2)+"\n");

console.log(file);
