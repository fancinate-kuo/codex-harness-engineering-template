import fs from "node:fs";

const taskId = process.argv[2];
if (!taskId) {
  console.log("Usage: pnpm harness:policy TASK-001");
  process.exit(0);
}

const shared = `.codex/orchestration/shared/${taskId}`;
const riskFile = `${shared}/change-risk.json`;

if (!fs.existsSync(riskFile)) {
  console.error(`Missing ${riskFile}. Run: pnpm harness:risk ${taskId}`);
  process.exit(2);
}

const risk = JSON.parse(fs.readFileSync(riskFile,"utf8"));
const policy = JSON.parse(fs.readFileSync(".codex/governance/policy.json","utf8"));

let decision = policy.automationModes[risk.risk] ?? "approval-required";
const approvalReasons = [];

for (const [key,value] of Object.entries(risk.signals ?? {})) {
  if (!value) continue;
  const map = {
    destructiveDatabaseChange:"destructive-database-change",
    authBoundaryChange:"auth-boundary-change",
    permissionModelChange:"permission-model-change",
    productionDeployment:"production-deployment",
    secretOrCredentialChange:"secret-or-credential-change",
    publicContractBreakingChange:"public-contract-breaking-change"
  };
  const signal = map[key];
  if (signal && policy.approvalRequiredFor.includes(signal)) {
    decision = risk.risk === "critical" ? "manual-only" : "approval-required";
    approvalReasons.push(signal);
  }
}

const result = {
  taskId,
  risk: risk.risk,
  automationDecision: decision,
  approvalReasons,
  evaluatedAt: new Date().toISOString()
};

fs.writeFileSync(`${shared}/policy-decision.json`,JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify(result,null,2));
