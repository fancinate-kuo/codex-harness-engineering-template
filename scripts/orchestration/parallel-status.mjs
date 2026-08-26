import fs from "node:fs";
const id=process.argv[2]; if(!id){console.log("Usage: pnpm harness:parallel:status TASK-001");process.exit(0);}
const s=JSON.parse(fs.readFileSync(`.codex/orchestration/runs/${id}/dag.json`,"utf8"));
for(const [k,v] of Object.entries(s.nodes)) console.log(`${k.padEnd(16)} ${v.status.padEnd(9)} retries=${v.retryCount} worktree=${v.worktree??"-"}`);
