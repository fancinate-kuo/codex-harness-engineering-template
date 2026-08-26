import fs from "node:fs";
import { overview, taskList, taskDetail } from "./lib/read-model.mjs";

const tasks=taskList();
const snapshot={
  generatedAt:new Date().toISOString(),
  version:"0.14.0",
  overview:overview(),
  tasks:tasks.map(t=>taskDetail(t.id))
};

const dir=".codex/control-plane/snapshots";
fs.mkdirSync(dir,{recursive:true});
const file=`${dir}/latest.json`;
fs.writeFileSync(file,JSON.stringify(snapshot,null,2)+"\n");
console.log(file);
