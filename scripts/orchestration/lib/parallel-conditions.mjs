import fs from "node:fs";
function load(file){ return fs.existsSync(file)?JSON.parse(fs.readFileSync(file,"utf8")):null; }
export function evaluateCondition(taskId, condition) {
  if (!condition) return true;
  if (condition === "database_change_required") {
    const x=load(`.codex/orchestration/shared/${taskId}/impact.json`);
    return Boolean(x?.databaseChangeRequired === true || (x?.tables ?? []).length || (x?.database ?? []).length);
  }
  return true;
}
