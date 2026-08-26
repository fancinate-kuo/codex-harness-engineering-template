import fs from "node:fs";
import path from "node:path";
import { query, closePool } from "./lib/db.mjs";

const dir="db/migrations";
const files=fs.readdirSync(dir).filter(f=>f.endsWith(".sql")).sort();

try {
  for(const file of files) {
    console.log(`Applying ${file}`);
    const sql=fs.readFileSync(path.join(dir,file),"utf8");
    await query(sql);
  }
  console.log("Migrations complete.");
} catch(err) {
  console.error(err.stack || err.message);
  process.exitCode=1;
} finally {
  await closePool();
}
