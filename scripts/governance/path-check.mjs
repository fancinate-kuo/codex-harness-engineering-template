import fs from "node:fs";
import { spawnSync } from "node:child_process";

const taskId=process.argv[2];
const base=process.argv[3] || "HEAD";

if(!taskId){
  console.log("Usage: pnpm harness:protected-paths TASK-001 [base]");
  process.exit(0);
}

const policy=JSON.parse(fs.readFileSync(".codex/governance/policy.json","utf8"));
const r=spawnSync("git",["diff","--name-only",base],{encoding:"utf8"});

if(r.status!==0){
  console.error(r.stderr || "git diff failed");
  process.exit(r.status ?? 1);
}

const files=r.stdout.split(/\r?\n/).filter(Boolean);
const protectedFiles=files.filter(file =>
  policy.protectedPaths.some(prefix => file.startsWith(prefix))
);

const shared=`.codex/orchestration/shared/${taskId}`;
fs.mkdirSync(shared,{recursive:true});

const result={
  taskId,
  changedFiles:files,
  protectedFiles,
  protectedPathChange:protectedFiles.length>0
};

fs.writeFileSync(`${shared}/protected-paths.json`,JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify(result,null,2));
