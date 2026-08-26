import fs from "node:fs";

const snap=".codex/control-plane/snapshots/latest.json";
if(!fs.existsSync(snap)){
  console.error("Missing snapshot. Run: pnpm harness:control:snapshot");
  process.exit(2);
}

const data=JSON.parse(fs.readFileSync(snap,"utf8"));
const out="apps/control-plane/public/data.json";
fs.mkdirSync("apps/control-plane/public",{recursive:true});
fs.writeFileSync(out,JSON.stringify(data,null,2)+"\n");
console.log(out);
