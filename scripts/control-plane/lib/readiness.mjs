import { checkDatabaseReadiness } from "../../persistence/lib/database-readiness.mjs";

export async function checkRuntimeReadiness({
  runtimeStore,
  databaseCheck = checkDatabaseReadiness,
} = {}) {
  if (runtimeStore === "filesystem") {
    return {
      ok: true,
      runtimeStore,
      checks: { configuration: "ready", database: "not_required", migrations: "not_required" },
      reason: null,
    };
  }

  const database = await databaseCheck();
  return {
    ok: database.ok,
    runtimeStore,
    checks: {
      configuration: "ready",
      ...database.checks,
    },
    reason: database.reason,
  };
}
