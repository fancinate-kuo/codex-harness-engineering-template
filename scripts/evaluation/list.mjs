import fs from "node:fs";

const suite=JSON.parse(fs.readFileSync(".codex/evaluation/suite.json","utf8"));

for(const file of suite.benchmarks??[]){
  const b=JSON.parse(fs.readFileSync(file,"utf8"));
  console.log(`${b.id}\t${b.category}\t${b.title}`);
}
