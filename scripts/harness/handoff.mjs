import fs from "node:fs";
import path from "node:path";

const name = process.argv[2] || "task";
const now = new Date();
const stamp = now.toISOString().replace(/[-:]/g, "").slice(0, 13);
const dir = ".codex/handoffs";
fs.mkdirSync(dir, { recursive: true });

const file = path.join(dir, `${stamp}-${name}.json`);
const payload = {
  task: name,
  goal: "",
  completed: [],
  changedFiles: [],
  decisions: [],
  remaining: [],
  risks: [],
  verification: {
    unit: "unknown",
    integration: "unknown",
    e2e: "unknown",
    architecture: "unknown"
  }
};

fs.writeFileSync(file, JSON.stringify(payload, null, 2));
console.log(file);
