import fs from "node:fs";
import { createRuntimeReadModel } from "./lib/runtime-read-model.mjs";

const runtimeReadModel = createRuntimeReadModel();
const tasks = await runtimeReadModel.taskList();
const snapshot={
  generatedAt:new Date().toISOString(),
  version:"0.17.0",
  runtimeStore: runtimeReadModel.mode,
  overview: await runtimeReadModel.overview(),
  tasks: await Promise.all(tasks.map(t => runtimeReadModel.taskDetail(t.id)))
};

const dir=".codex/control-plane/snapshots";
fs.mkdirSync(dir,{recursive:true});
const file=`${dir}/latest.json`;
fs.writeFileSync(file,JSON.stringify(snapshot,null,2)+"\n");
console.log(file);
