import fs from "node:fs";

const taskId=process.argv[2];
if(!taskId){
  console.log("Usage: pnpm harness:eval:score EVAL-BENCH-001");
  process.exit(0);
}

const shared=`.codex/orchestration/shared/${taskId}`;
const benchFile=`${shared}/benchmark.json`;
const wfFile=`.codex/orchestration/runs/${taskId}/compiled-workflow.json`;
const obsFile=`.codex/observability/tasks/${taskId}/summary.json`;

if(!fs.existsSync(benchFile) || !fs.existsSync(wfFile)){
  console.error("Missing benchmark or compiled workflow");
  process.exit(2);
}

const b=JSON.parse(fs.readFileSync(benchFile,"utf8"));
const wf=JSON.parse(fs.readFileSync(wfFile,"utf8"));
const obs=fs.existsSync(obsFile)?JSON.parse(fs.readFileSync(obsFile,"utf8")):null;

const ids=new Set((wf.nodes??[]).map(n=>n.id));
const exp=b.expectations??{};

const requiredMissing=(exp.requiredNodes??[]).filter(x=>!ids.has(x));
const forbiddenPresent=(exp.forbiddenNodes??[]).filter(x=>ids.has(x));

const retries=obs?.metrics?.retries??0;
const replans=obs?.metrics?.replans??0;

const checks={
  requiredNodes: requiredMissing.length===0,
  forbiddenNodes: forbiddenPresent.length===0,
  retries: retries <= (exp.maxRetries ?? Infinity),
  replans: replans <= (exp.maxReplans ?? Infinity)
};

const passed=Object.values(checks).every(Boolean);
const score=Math.round(
  (Object.values(checks).filter(Boolean).length/Object.keys(checks).length)*100
);

const result={
  taskId,
  benchmarkId:b.id,
  passed,
  score,
  checks,
  details:{
    requiredMissing,
    forbiddenPresent,
    retries,
    replans
  },
  generatedAt:new Date().toISOString()
};

const outDir=".codex/evaluation/results";
fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(`${outDir}/${taskId}.json`,JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify(result,null,2));
