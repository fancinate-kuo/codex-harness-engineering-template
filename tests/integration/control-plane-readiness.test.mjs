import { describe, expect, it } from "vitest";
import { createControlPlaneConfig } from "../../scripts/control-plane/lib/config.mjs";
import { startControlPlaneServer } from "../../scripts/control-plane/server.mjs";

describe("Control Plane production readiness interface", () => {
  it("keeps liveness available and reports readiness failures safely", async () => {
    const records = [];
    let databaseClosed = false;
    const config = createControlPlaneConfig({
      environment: {
        HARNESS_CONTROL_PLANE_TOKEN: "test-token",
        HARNESS_CONTROL_PLANE_ORIGINS: "https://allowed.example",
      },
      fileConfig: { api: { host: "127.0.0.1", port: 4317 } },
    });
    const app = await startControlPlaneServer({
      config,
      readiness: async () => ({
        ok: false,
        runtimeStore: "filesystem",
        checks: { configuration: "ready", database: "not_required", migrations: "not_required" },
        reason: "test_not_ready",
      }),
      closeDatabase: async () => { databaseClosed = true; },
      logger: {
        info: record => records.push(record),
        error: record => records.push(record),
      },
    });
    const port = app.server.address().port;

    try {
      const health = await fetch(`http://127.0.0.1:${port}/health`);
      expect(health.status).toBe(200);
      await expect(health.json()).resolves.toMatchObject({ ok: true, version: "0.17.0" });

      const ready = await fetch(`http://127.0.0.1:${port}/ready`);
      expect(ready.status).toBe(503);
      await expect(ready.json()).resolves.toMatchObject({ ok: false, reason: "test_not_ready" });

      const protectedRead = await fetch(`http://127.0.0.1:${port}/overview`);
      expect(protectedRead.status).toBe(401);
      expect(health.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
      expect(records.some(record => record.type === "http.request" && record.status === 200)).toBe(true);
      expect(JSON.stringify(records)).not.toContain("test-token");
    } finally {
      await app.shutdown("test");
    }

    expect(databaseClosed).toBe(true);
    expect(records.some(record => record.type === "control_plane.shutdown")).toBe(true);
  });
});
