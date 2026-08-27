import { closePool } from "./lib/db.mjs";
import { checkDatabaseReadiness } from "./lib/database-readiness.mjs";

try {
  const readiness = await checkDatabaseReadiness();
  console.log(JSON.stringify(readiness, null, 2));
  if (!readiness.ok) process.exitCode=1;
} catch(err) {
  console.error(JSON.stringify({ ok: false, reason: "database_check_failed" }));
  process.exitCode=1;
} finally {
  await closePool();
}
