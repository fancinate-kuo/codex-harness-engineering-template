import fs from "node:fs";

export function readJson(file, fallback=null) {
  if(!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file,"utf8"));
}

export function readJsonl(file) {
  if(!fs.existsSync(file)) return [];
  return fs.readFileSync(file,"utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map(JSON.parse);
}

export function taskList() {
  return readJson(".codex/orchestration/queue/tasks.json",{tasks:[]}).tasks ?? [];
}

export function taskDetail(taskId) {
  const task=taskList().find(t=>t.id===taskId) ?? null;
  const run=readJson(`.codex/orchestration/runs/${taskId}/run.json`);
  const dag=readJson(`.codex/orchestration/runs/${taskId}/dag.json`);
  const workflow=readJson(`.codex/orchestration/runs/${taskId}/compiled-workflow.json`);
  const approval=readJson(`.codex/orchestration/shared/${taskId}/approval.json`);
  const policy=readJson(`.codex/orchestration/shared/${taskId}/policy-decision.json`);
  const risk=readJson(`.codex/orchestration/shared/${taskId}/change-risk.json`);
  const obs=readJson(`.codex/observability/tasks/${taskId}/summary.json`);
  const metrics=readJsonl(`.codex/observability/tasks/${taskId}/metrics.jsonl`);
  const audit=readJsonl(`.codex/observability/tasks/${taskId}/audit.jsonl`);
  const tokenCost=readJsonl(`.codex/observability/tasks/${taskId}/token-cost.jsonl`);
  const memory=readJson(`.codex/orchestration/shared/${taskId}/memory-context.json`);
  const feedbackDir=`.codex/orchestration/shared/${taskId}/feedback`;
  const feedback=fs.existsSync(feedbackDir)
    ? fs.readdirSync(feedbackDir).filter(x=>x.endsWith(".json"))
      .sort().map(x=>readJson(`${feedbackDir}/${x}`))
    : [];

  return {task,run,dag,workflow,approval,policy,risk,observability:obs,metrics,audit,tokenCost,memory,feedback};
}

export function overview() {
  const tasks=taskList();
  const pendingApprovals=tasks.filter(t=>{
    const a=readJson(`.codex/orchestration/shared/${t.id}/approval.json`);
    return a?.decision==="pending";
  }).length;

  const blockedTasks=tasks.filter(t=>["blocked","failed"].includes(t.state)).length;
  const runningTasks=tasks.filter(t=>["planning","impact_analysis","implementing","testing","reviewing","fixing","ready_for_pr"].includes(t.state)).length;
  const evalSummary=readJson(".codex/evaluation/results/summary.json",{passRate:0});

  return {
    taskCounts:{
      total:tasks.length,
      running:runningTasks,
      blocked:blockedTasks
    },
    pendingApprovals,
    benchmarkPassRate:evalSummary?.passRate ?? 0
  };
}
