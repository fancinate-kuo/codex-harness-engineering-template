import fs from "node:fs";
const taskId=process.argv[2];
if(!taskId){console.log("Usage: pnpm harness:dag:print TASK-001");process.exit(0);}
const f=`.codex/orchestration/runs/${taskId}/compiled-workflow.json`;
const wf=JSON.parse(fs.readFileSync(f,"utf8"));
console.log(`digraph "${wf.name}" {`);
for(const n of wf.nodes) console.log(`  "${n.id}";`);
for(const n of wf.nodes) for(const d of n.dependsOn??[]) console.log(`  "${d}" -> "${n.id}";`);
console.log("}");
