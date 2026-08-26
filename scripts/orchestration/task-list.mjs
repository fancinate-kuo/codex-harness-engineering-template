import fs from "node:fs";

const file = ".codex/orchestration/queue/tasks.json";
const data = JSON.parse(fs.readFileSync(file, "utf8"));

if (!data.tasks.length) {
  console.log("No queued tasks.");
  process.exit(0);
}

for (const t of data.tasks) {
  console.log(`${t.id}\t${t.state}\t${t.priority}\t${t.title}`);
}
