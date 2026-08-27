import { query } from "./db.mjs";
import { listMigrationVersions } from "./migration-contract.mjs";

export async function checkDatabaseReadiness({
  execute = query,
  migrationDirectory,
} = {}) {
  try {
    await execute("SELECT 1 AS ok");
  } catch {
    return {
      ok: false,
      reason: "database_unavailable",
      checks: { database: "unavailable", migrations: "not_checked" },
      missingMigrations: [],
    };
  }

  try {
    const trackingTable = await execute(
      "SELECT to_regclass('harness.schema_migrations') AS table_name",
    );
    if (!trackingTable.rows[0]?.table_name) {
      return {
        ok: false,
        reason: "migration_tracking_unavailable",
        checks: { database: "ready", migrations: "unavailable" },
        missingMigrations: listMigrationVersions(migrationDirectory),
      };
    }

    const appliedResult = await execute(
      "SELECT version FROM harness.schema_migrations ORDER BY version",
    );
    const requiredMigrations = listMigrationVersions(migrationDirectory);
    const appliedMigrations = appliedResult.rows
      .map(row => row.version)
      .filter(version => typeof version === "string");
    const applied = new Set(appliedMigrations);
    const missingMigrations = requiredMigrations.filter(version => !applied.has(version));

    return {
      ok: missingMigrations.length === 0,
      reason: missingMigrations.length === 0 ? null : "migrations_pending",
      checks: {
        database: "ready",
        migrations: missingMigrations.length === 0 ? "ready" : "pending",
      },
      requiredMigrations,
      appliedMigrations,
      missingMigrations,
    };
  } catch {
    return {
      ok: false,
      reason: "migration_state_unavailable",
      checks: { database: "ready", migrations: "unavailable" },
      missingMigrations: [],
    };
  }
}
