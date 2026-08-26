import fs from "node:fs";
import path from "node:path";

const name = process.argv[2] || "task";
const now = new Date();
const stamp = now.toISOString().replace(/[-:]/g, "").slice(0, 13);
const dir = ".codex/checkpoints";
fs.mkdirSync(dir, { recursive: true });

const file = path.join(dir, `${stamp}-${name}.json`);
const payload = {
  task: name,
  status: "started",
  createdAt: now.toISOString(),
  affectedModules: [],
  completed: [],
  next: []
};

fs.writeFileSync(file, JSON.stringify(payload, null, 2));
console.log(file);
