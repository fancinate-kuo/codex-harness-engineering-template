import { describe, expect, it, afterAll, beforeAll } from "vitest";
import { createControlPlaneConfig } from "../../scripts/control-plane/lib/config.mjs";
import { startControlPlaneServer } from "../../scripts/control-plane/server.mjs";
import { checkDatabaseReadiness } from "../../scripts/persistence/lib/database-readiness.mjs";
import { closePool, query } from "../../scripts/persistence/lib/db.mjs";
import { appendEvent, loadEvents } from "../../scripts/persistence/lib/event-store.mjs";
import { decidePostgresApproval } from "../../scripts/persistence/lib/approval.mjs";
import { upsertTask, saveApproval } from "../../scripts/persistence/lib/repository.mjs";
import {
  acquireTaskLease,
  releaseTaskLease,
  rememberIdempotency,
} from "../../scripts/persistence/lib/runtime-coordination.mjs";

const postgresTests = process.env.HARNESS_DATABASE_URL ? describe : describe.skip;
let app;
let taskId;

postgresTests("PostgreSQL production contract", () => {
  beforeAll(async () => {
    taskId = `PG-CI-${process.pid}-${Date.now()}`;
    const config = createControlPlaneConfig({
      environment: {
        ...process.env,
        HARNESS_RUNTIME_STORE: "postgres",
        HARNESS_CONTROL_PLANE_HOST: "127.0.0.1",
        HARNESS_CONTROL_PLANE_PORT: "4333",
      },
      fileConfig: {},
    });
    app = await startControlPlaneServer({ config });
  });

  afterAll(async () => {
    if (app) await app.shutdown("postgres-test");
    await query("DELETE FROM harness.events WHERE task_id=$1", [taskId]);
    await query("DELETE FROM harness.tasks WHERE id=$1", [taskId]);
    await closePool();
  });

  it("reports database and migration readiness", async () => {
    const readiness = await checkDatabaseReadiness();
    expect(readiness.ok).toBe(true);
    expect(readiness.checks).toEqual({ database: "ready", migrations: "ready" });

    const port = app.server.address().port;
    const response = await fetch(`http://127.0.0.1:${port}/ready`);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      runtimeStore: "postgres",
      checks: { database: "ready", migrations: "ready" },
    });
  });

  it("persists task, approval, coordination, and event records", async () => {
    await upsertTask({
      id: taskId,
      title: "PostgreSQL readiness test",
      state: "testing",
      priority: "high",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await saveApproval(taskId, {
      decision: "pending",
      requestedAt: new Date().toISOString(),
      scope: ["production-readiness"],
    });

    const lease = await acquireTaskLease(taskId, "ci-runner", { leaseToken: `lease-${process.pid}` });
    expect(await releaseTaskLease(taskId, "ci-runner", lease.leaseToken)).toBe(true);

    const first = await rememberIdempotency("postgres-ci", `request-${taskId}`, { accepted: true });
    const replay = await rememberIdempotency("postgres-ci", `request-${taskId}`, { accepted: false });
    expect(first).toEqual({ response: { accepted: true }, replayed: false });
    expect(replay).toEqual({ response: { accepted: true }, replayed: true });

    const approval = await decidePostgresApproval(taskId, "approved", "ci-reviewer", "contract verified");
    expect(approval).toMatchObject({ taskId, decision: "approved", decidedBy: "ci-reviewer" });

    await appendEvent({
      taskId,
      type: "postgres.readiness.checked",
      aggregateType: "task",
      aggregateId: taskId,
      payload: { ok: true },
    });
    const events = await loadEvents(taskId);
    expect(events.some(event => event.type === "postgres.readiness.checked")).toBe(true);

    const stored = await query("SELECT state FROM harness.tasks WHERE id=$1", [taskId]);
    expect(stored.rows[0]?.state).toBe("testing");
  });
});
