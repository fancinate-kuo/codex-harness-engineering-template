import fs from "node:fs";

const id = process.argv[2];
const title = process.argv.slice(3).join(" ");

if (!id || !title) {
  console.log(`Usage: pnpm harness:task:create TASK-001 "Pin forum post"`);
  process.exit(0);
}

const file = ".codex/orchestration/queue/tasks.json";
const data = JSON.parse(fs.readFileSync(file, "utf8"));

if (data.tasks.some(t => t.id === id)) {
  console.error(`Task already exists: ${id}`);
  process.exit(2);
}

const now = new Date().toISOString();

data.tasks.push({
  id,
  title,
  requirementId: null,
  featureId: null,
  state: "proposed",
  priority: "normal",
  assignedAgent: null,
  worktree: null,
  createdAt: now,
  updatedAt: now
});

fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
console.log(`Created task ${id}`);
