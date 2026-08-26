import { spawnSync } from "node:child_process";
import fs from "node:fs";

const base = process.argv[2] || "HEAD";
const diff = spawnSync("git", ["diff", "--name-only", base], {
  encoding: "utf8"
});

if (diff.status !== 0) {
  console.error(diff.stderr || "git diff failed");
  process.exit(diff.status ?? 1);
}

const files = diff.stdout.split(/\r?\n/).filter(Boolean);

const result = {
  base,
  changedFiles: files,
  recommendedGraphAction: files.length ? "gitnexus.detect_changes" : "none"
};

fs.mkdirSync(".codex/context/generated", { recursive: true });
fs.writeFileSync(
  ".codex/context/generated/diff-context.json",
  JSON.stringify(result, null, 2)
);

console.log(JSON.stringify(result, null, 2));
