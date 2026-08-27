import fs from "node:fs";
import { query, transaction, closePool } from "./lib/db.mjs";
import { listMigrationVersions, migrationPath } from "./lib/migration-contract.mjs";

const files=listMigrationVersions();

try {
  await query("CREATE SCHEMA IF NOT EXISTS harness");
  await query(`CREATE TABLE IF NOT EXISTS harness.schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);

  for(const file of files) {
    const sql=fs.readFileSync(migrationPath(file),"utf8");
    const applied = await transaction(async client => {
      await client.query("SELECT pg_advisory_xact_lock(hashtext('harness:migrations'))");
      const existing = await client.query(
        "SELECT 1 FROM harness.schema_migrations WHERE version=$1",
        [file]
      );
      if (existing.rowCount) return false;
      await client.query(sql);
      await client.query(
        "INSERT INTO harness.schema_migrations(version) VALUES ($1)",
        [file]
      );
      return true;
    });
    console.log(`${applied ? "Applied" : "Skipped"} ${file}`);
  }
  console.log("Migrations complete.");
} catch(err) {
  console.error(err.stack || err.message);
  process.exitCode=1;
} finally {
  await closePool();
}
