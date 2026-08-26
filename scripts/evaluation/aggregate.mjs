import fs from "node:fs";

const dir=".codex/evaluation/results";
if(!fs.existsSync(dir)){
  console.log(JSON.stringify({count:0,passRate:0,averageScore:0},null,2));
  process.exit(0);
}

const results=fs.readdirSync(dir)
  .filter(f=>f.endsWith(".json"))
  .map(f=>JSON.parse(fs.readFileSync(`${dir}/${f}`,"utf8")));

const count=results.length;
const passed=results.filter(r=>r.passed).length;
const avg=count?results.reduce((a,r)=>a+r.score,0)/count:0;

const summary={
  generatedAt:new Date().toISOString(),
  count,
  passed,
  failed:count-passed,
  passRate:count?Math.round((passed/count)*10000)/100:0,
  averageScore:Math.round(avg*100)/100
};

fs.writeFileSync(`${dir}/summary.json`,JSON.stringify(summary,null,2)+"\n");
console.log(JSON.stringify(summary,null,2));
