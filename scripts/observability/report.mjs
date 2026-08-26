import fs from "node:fs";

const taskId=process.argv[2];
if(!taskId){console.log("Usage: pnpm harness:report TASK-001");process.exit(0);}

const base=`.codex/observability/tasks/${taskId}`;
const summaryFile=`${base}/summary.json`;

if(!fs.existsSync(summaryFile)){
  console.error(`Missing ${summaryFile}. Run: pnpm harness:summary ${taskId}`);
  process.exit(2);
}

const s=JSON.parse(fs.readFileSync(summaryFile,"utf8"));

const lines=[
  `# Harness Execution Report — ${taskId}`,
  ``,
  `Generated: ${s.generatedAt}`,
  ``,
  `## Metrics`,
  ``,
  `- Retries: ${s.metrics.retries}`,
  `- Replans: ${s.metrics.replans}`,
  `- Self-corrections: ${s.metrics.selfCorrections}`,
  `- Blocked events: ${s.metrics.blocked}`,
  `- Test failures: ${s.metrics.testFailures}`,
  `- Review failures: ${s.metrics.reviewFailures}`,
  `- Unexpected graph impact: ${s.metrics.unexpectedImpact}`,
  `- PR gate failures: ${s.metrics.prGateFailures}`,
  `- Node executions: ${s.metrics.nodeExecutions}`,
  `- Total node execution ms: ${s.metrics.totalNodeExecutionMs}`,
  `- Audit events: ${s.auditEvents}`,
  ``
];

fs.mkdirSync(base,{recursive:true});
fs.writeFileSync(`${base}/report.md`,lines.join("\n"));
console.log(`${base}/report.md`);
