import fs from "node:fs";

const aFile=process.argv[2];
const bFile=process.argv[3];

if(!aFile||!bFile){
  console.log("Usage: pnpm harness:eval:compare result-a.json result-b.json");
  process.exit(0);
}

const a=JSON.parse(fs.readFileSync(aFile,"utf8"));
const b=JSON.parse(fs.readFileSync(bFile,"utf8"));

console.log(JSON.stringify({
  a:{id:a.benchmarkId??a.id,score:a.score??null,passed:a.passed??null},
  b:{id:b.benchmarkId??b.id,score:b.score??null,passed:b.passed??null},
  delta:{
    score:(b.score??0)-(a.score??0)
  }
},null,2));
