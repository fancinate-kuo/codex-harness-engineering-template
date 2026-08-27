import { describe, expect, it } from "vitest";
import { createControlPlaneConfig } from "../../scripts/control-plane/lib/config.mjs";
import { checkRuntimeReadiness } from "../../scripts/control-plane/lib/readiness.mjs";
import { checkDatabaseReadiness } from "../../scripts/persistence/lib/database-readiness.mjs";
import { getDatabaseConfig } from "../../scripts/persistence/lib/db.mjs";

describe("production runtime configuration", () => {
  it("requires token and explicit origins in production", () => {
    expect(() => createControlPlaneConfig({
      environment: { NODE_ENV: "production" },
      fileConfig: {},
    })).toThrow("HARNESS_CONTROL_PLANE_TOKEN");

    expect(() => createControlPlaneConfig({
      environment: {
        NODE_ENV: "production",
        HARNESS_CONTROL_PLANE_TOKEN: "production-token",
      },
      fileConfig: {},
    })).toThrow("HARNESS_CONTROL_PLANE_ORIGINS");

    const config = createControlPlaneConfig({
      environment: {
        NODE_ENV: "production",
        HARNESS_CONTROL_PLANE_TOKEN: "production-token",
        HARNESS_CONTROL_PLANE_ORIGINS: "https://control.example",
      },
      fileConfig: {},
    });
    expect(config.security.requireAuth).toBe(true);
    expect(config.security.allowedOrigins).toEqual(["https://control.example"]);
    expect(config.version).toBe("0.17.0");
  });

  it("rejects invalid server and database settings", () => {
    expect(() => createControlPlaneConfig({
      environment: { HARNESS_CONTROL_PLANE_PORT: "not-a-port" },
      fileConfig: {},
    })).toThrow("HARNESS_CONTROL_PLANE_PORT");
    expect(() => getDatabaseConfig({ HARNESS_DB_POOL_MAX: "NaN" }))
      .toThrow("HARNESS_DB_POOL_MAX");
    expect(() => getDatabaseConfig({ HARNESS_DB_CONNECTION_TIMEOUT_MS: "10" }))
      .toThrow("HARNESS_DB_CONNECTION_TIMEOUT_MS");
  });
});

describe("runtime readiness", () => {
  it("marks filesystem mode ready without requiring a database", async () => {
    await expect(checkRuntimeReadiness({ runtimeStore: "filesystem" })).resolves.toEqual({
      ok: true,
      runtimeStore: "filesystem",
      checks: { configuration: "ready", database: "not_required", migrations: "not_required" },
      reason: null,
    });
  });

  it("reports pending migrations without exposing database details", async () => {
    const execute = async sql => {
      if (sql.startsWith("SELECT 1")) return { rows: [{ ok: 1 }] };
      if (sql.includes("to_regclass")) return { rows: [{ table_name: "harness.schema_migrations" }] };
      return { rows: [{ version: "001_init.sql" }] };
    };

    const readiness = await checkDatabaseReadiness({ execute });
    expect(readiness.ok).toBe(false);
    expect(readiness.reason).toBe("migrations_pending");
    expect(readiness.checks).toEqual({ database: "ready", migrations: "pending" });
    expect(JSON.stringify(readiness)).not.toContain("postgres://");
  });

  it("maps database failures to a safe unavailable result", async () => {
    const readiness = await checkDatabaseReadiness({
      execute: async () => { throw new Error("password=super-secret host=db.internal"); },
    });
    expect(readiness).toEqual({
      ok: false,
      reason: "database_unavailable",
      checks: { database: "unavailable", migrations: "not_checked" },
      missingMigrations: [],
    });
  });
});
