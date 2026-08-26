import fs from "node:fs";
import path from "node:path";

const taskId = process.argv[2];
if (!taskId) {
  console.log("Usage: pnpm harness:feedback:classify TASK-001");
  process.exit(0);
}

const dir = `.codex/orchestration/shared/${taskId}/feedback`;
if (!fs.existsSync(dir)) {
  console.log("No feedback events.");
  process.exit(0);
}

function classify(e) {
  const text = `${e.source} ${e.summary}`.toLowerCase();

  if (e.status !== "failed") return null;
  if (e.source === "playwright" || text.includes("visual") || text.includes("ui")) return "ui-regression";
  if (e.source === "architecture" || text.includes("boundary") || text.includes("dependency rule")) return "architecture-violation";
  if (e.source === "security" || text.includes("vulnerability") || text.includes("taint")) return "security-finding";
  if (e.source === "migration" || text.includes("migration") || text.includes("schema")) return "migration-failure";
  if (e.source === "graph" || text.includes("unexpected impact") || text.includes("blast radius")) return "unexpected-impact";
  if (["unit","integration","ci"].includes(e.source) || text.includes("test")) return "test-regression";
  if (text.includes("timeout") || text.includes("network") || text.includes("flaky")) return "transient";
  return "unknown";
}

const files = fs.readdirSync(dir).filter(f=>f.endsWith(".json")).sort();
const result = [];

for (const file of files) {
  const full = path.join(dir,file);
  const e = JSON.parse(fs.readFileSync(full,"utf8"));
  if (!e.classification) {
    e.classification = classify(e);
    fs.writeFileSync(full,JSON.stringify(e,null,2)+"\n");
  }
  result.push({file,classification:e.classification,status:e.status,source:e.source});
}

console.log(JSON.stringify(result,null,2));
