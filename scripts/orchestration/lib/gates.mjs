import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { sharedDir } from "./state.mjs";

export function hasArtifact(taskId, name) {
  return fs.existsSync(`${sharedDir(taskId)}/${name}`);
}

export function hasCheckpoint(taskId) {
  const dir = ".codex/checkpoints";
  if (!fs.existsSync(dir)) return false;
  return fs.readdirSync(dir).some(f =>
    f.includes(taskId) || f.toLowerCase().includes(taskId.toLowerCase())
  );
}

export function hasHandoff(taskId) {
  const dir = ".codex/handoffs";
  if (!fs.existsSync(dir)) return false;
  return fs.readdirSync(dir).some(f =>
    f.includes(taskId) || f.toLowerCase().includes(taskId.toLowerCase())
  );
}

export function harnessVerify() {
  const result = spawnSync(
    "pnpm",
    ["run", "harness:verify"],
    {
      stdio: "inherit",
      shell: process.platform === "win32"
    }
  );
  return result.status === 0;
}

export function validateRequirement(taskId, requirement, options = {}) {
  if (requirement === "@checkpoint") {
    return hasCheckpoint(taskId);
  }
  if (requirement === "@handoff") {
    return hasHandoff(taskId);
  }
  if (requirement === "@harness_verify") {
    if (options.skipHarnessVerify) return true;
    return harnessVerify();
  }
  return hasArtifact(taskId, requirement);
}
