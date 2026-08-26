import fs from "node:fs";

const taskId = process.argv[2];
if (!taskId) {
  console.log("Usage: pnpm harness:risk TASK-001");
  process.exit(0);
}

const shared = `.codex/orchestration/shared/${taskId}`;
const impactFile = `${shared}/impact.json`;
const dagInputFile = `${shared}/dag-input.json`;

const impact = fs.existsSync(impactFile)
  ? JSON.parse(fs.readFileSync(impactFile,"utf8"))
  : {};

const dagInput = fs.existsSync(dagInputFile)
  ? JSON.parse(fs.readFileSync(dagInputFile,"utf8"))
  : {};

const signals = {
  destructiveDatabaseChange: Boolean(
    impact.destructiveDatabaseChange ||
    impact.dropTable ||
    impact.dropColumn
  ),
  authBoundaryChange: Boolean(
    impact.authBoundaryChange ||
    impact.authenticationChange
  ),
  permissionModelChange: Boolean(
    impact.permissionModelChange ||
    impact.authorizationChange
  ),
  productionDeployment: Boolean(impact.productionDeployment),
  secretOrCredentialChange: Boolean(
    impact.secretOrCredentialChange ||
    impact.secretChange
  ),
  publicContractBreakingChange: Boolean(
    impact.publicContractBreakingChange ||
    impact.breakingApiChange
  ),
  protectedPathChange: Boolean(impact.protectedPathChange)
};

let risk = dagInput?.signals?.risk ?? impact.risk ?? "medium";
const reasons = [];

if (signals.destructiveDatabaseChange) {
  risk = "critical";
  reasons.push("destructive database change");
}
if (
  signals.authBoundaryChange ||
  signals.permissionModelChange ||
  signals.secretOrCredentialChange ||
  signals.publicContractBreakingChange
) {
  if (risk !== "critical") risk = "high";
  reasons.push("sensitive boundary/contract change");
}
if (signals.protectedPathChange && risk === "low") {
  risk = "medium";
  reasons.push("protected path change");
}

const result = {taskId,risk,signals,reasons};

fs.mkdirSync(shared,{recursive:true});
fs.writeFileSync(`${shared}/change-risk.json`,JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify(result,null,2));
