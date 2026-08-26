import { query, closePool } from "./lib/db.mjs";

try {
  const r=await query("SELECT now() AS now, current_database() AS database");
  console.log(JSON.stringify({ok:true,...r.rows[0]},null,2));
} catch(err) {
  console.error(err.message);
  process.exitCode=1;
} finally {
  await closePool();
}
