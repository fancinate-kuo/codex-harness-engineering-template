import fs from "node:fs";

const path = ".codex/context/repo-map.json";
if (!fs.existsSync(path)) {
  console.error(`Missing ${path}`);
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(path, "utf8"));
console.log(`Repo map OK. Modules: ${Object.keys(data.modules ?? {}).join(", ") || "(none)"}`);
