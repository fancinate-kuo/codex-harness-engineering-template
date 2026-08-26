import fs from "node:fs";

const dir = ".codex/orchestration/requests";
fs.mkdirSync(dir, { recursive: true });

const files = fs.readdirSync(dir)
  .filter(f => f.endsWith(".json"))
  .sort();

if (!files.length) {
  console.log("No pending agent requests.");
  process.exit(0);
}

for (const file of files) {
  const data = JSON.parse(fs.readFileSync(`${dir}/${file}`, "utf8"));
  console.log(`${data.taskId}\t${data.stageId}\t${data.agent}\t${file}`);
}
