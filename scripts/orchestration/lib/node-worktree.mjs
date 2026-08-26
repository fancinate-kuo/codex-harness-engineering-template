import fs from "node:fs";
import { spawnSync } from "node:child_process";
export function ensureNodeWorktree(taskId,nodeId) {
  const path=`.codex/worktrees/${taskId}__${nodeId}`;
  if (fs.existsSync(path)) return path;
  fs.mkdirSync(".codex/worktrees",{recursive:true});
  const branch=`agent/${taskId.toLowerCase()}-${nodeId}`;
  const r=spawnSync("git",["worktree","add",path,"-b",branch],{stdio:"inherit",shell:process.platform==="win32"});
  if (r.status!==0) throw new Error(`Failed to create worktree for ${taskId}/${nodeId}`);
  return path;
}
