import fs from "node:fs";

const taskId=process.argv[2];
if(!taskId){console.log("Usage: pnpm harness:summary TASK-001");process.exit(0);}

const base=`.codex/observability/tasks/${taskId}`;
const metricsFile=`${base}/metrics.jsonl`;
const auditFile=`${base}/audit.jsonl`;

function readJsonl(file){
  if(!fs.existsSync(file)) return [];
  return fs.readFileSync(file,"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
}

const metrics=readJsonl(metricsFile);
const audits=readJsonl(auditFile);

const sum=(type)=>metrics.filter(m=>m.type===type).reduce((a,m)=>a+(Number(m.value)||0),0);
const count=(type)=>metrics.filter(m=>m.type===type).length;

const summary={
  taskId,
  generatedAt:new Date().toISOString(),
  metrics:{
    retries:sum("retry_count"),
    replans:sum("replan_count"),
    selfCorrections:sum("self_correction_count"),
    blocked:sum("blocked_count"),
    testFailures:sum("test_failure_count"),
    reviewFailures:sum("review_failure_count"),
    unexpectedImpact:sum("graph_unexpected_impact_count"),
    prGateFailures:sum("pr_gate_failure_count"),
    nodeExecutions:count("node_execution_time_ms"),
    totalNodeExecutionMs:sum("node_execution_time_ms")
  },
  auditEvents:audits.length
};

fs.mkdirSync(base,{recursive:true});
fs.writeFileSync(`${base}/summary.json`,JSON.stringify(summary,null,2)+"\n");
console.log(JSON.stringify(summary,null,2));
