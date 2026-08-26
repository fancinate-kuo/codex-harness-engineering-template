import fs from "node:fs";
const wf=JSON.parse(fs.readFileSync(".codex/orchestration/parallel-workflow.json","utf8"));
console.log("digraph Harness {");
for(const n of wf.nodes) console.log(`  "${n.id}";`);
for(const n of wf.nodes) for(const d of n.dependsOn??[]) console.log(`  "${d}" -> "${n.id}";`);
console.log("}");
