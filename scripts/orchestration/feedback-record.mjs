import fs from "node:fs";

const taskId = process.argv[2];
const source = process.argv[3];
const status = process.argv[4];
const summary = process.argv.slice(5).join(" ");

if (!taskId || !source || !status) {
  console.log('Usage: pnpm harness:feedback:record TASK-001 test failed "summary"');
  process.exit(0);
}

const dir = `.codex/orchestration/shared/${taskId}/feedback`;
fs.mkdirSync(dir,{recursive:true});

const event = {
  taskId,
  source,
  status,
  summary: summary || "",
  evidence: [],
  classification: null,
  createdAt: new Date().toISOString()
};

const name = `${Date.now()}-${source}-${status}.json`;
fs.writeFileSync(`${dir}/${name}`,JSON.stringify(event,null,2)+"\n");
console.log(`${dir}/${name}`);
