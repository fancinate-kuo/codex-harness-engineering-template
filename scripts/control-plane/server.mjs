import http from "node:http";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { handleForumRequest } from "../../apps/api/src/modules/forum/index.mjs";
import { closePool } from "../persistence/lib/db.mjs";
import { readJson } from "./lib/read-model.mjs";
import { createControlPlaneConfig } from "./lib/config.mjs";
import { checkRuntimeReadiness } from "./lib/readiness.mjs";
import { createRuntimeReadModel } from "./lib/runtime-read-model.mjs";
import {
  actorFromRequest,
  appendMutationAudit,
  isAllowedOrigin,
  isAuthorized,
  isJsonContentType,
  parseJsonBody,
  validateApprovalPayload,
  validateTaskId,
} from "./lib/security.mjs";

function defaultLogger() {
  return {
    info: record => console.log(JSON.stringify(record)),
    error: record => console.error(JSON.stringify(record)),
  };
}

function createRequestContext(request, config, logger) {
  const requestId = randomUUID();
  const startedAt = process.hrtime.bigint();
  let completed = false;

  return {
    requestId,
    complete(status) {
      if (completed) return;
      completed = true;
      logger.info({
        type: "http.request",
        requestId,
        method: request.method,
        path: new URL(request.url ?? "/", "http://localhost").pathname,
        status,
        durationMs: Number(process.hrtime.bigint() - startedAt) / 1_000_000,
        runtimeStore: config.runtimeStore,
      });
    },
  };
}

function send(res, status, body, request, context, security) {
  const text = JSON.stringify(body, null, 2);
  const origin = request?.headers?.origin;
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "authorization,content-type,x-control-plane-actor",
    "cache-control": "no-store",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-request-id": context.requestId,
    vary: "Origin",
  };
  if (origin && isAllowedOrigin(origin, security)) {
    headers["access-control-allow-origin"] = origin;
  }
  res.writeHead(status, headers);
  res.end(text);
  context.complete(status);
}

function runDetached(taskId, emit) {
  const child = spawn(process.execPath, ["scripts/control-plane/runtime-run.mjs", taskId], {
    detached: true,
    stdio: "ignore",
    shell: false,
  });
  child.unref();
  emit("task", { taskId, action: "run-requested", at: new Date().toISOString() });
}

export function createControlPlaneServer({
  config = createControlPlaneConfig(),
  runtimeReadModel = createRuntimeReadModel(),
  readiness = () => checkRuntimeReadiness({ runtimeStore: config.runtimeStore }),
  closeDatabase = closePool,
  logger = defaultLogger(),
} = {}) {
  const sseClients = new Set();
  let draining = false;

  function emit(event, payload) {
    const message = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const response of sseClients) {
      try {
        response.write(message);
      } catch {
        sseClients.delete(response);
      }
    }
  }

  function appendAudit(event) {
    return appendMutationAudit({ ...event, auditFile: config.auditFile });
  }

  const snapshotTimer = setInterval(() => {
    if (draining) return;
    runtimeReadModel.overview()
      .then(currentOverview => emit("snapshot", {
        overview: currentOverview,
        at: new Date().toISOString(),
      }))
      .catch(error => {
        logger.error({
          type: "control_plane.snapshot_error",
          error: "runtime_snapshot_failed",
          code: error.code || "UNHANDLED_ERROR",
        });
        emit("error", { message: "runtime_snapshot_failed" });
      });
  }, 5_000);
  snapshotTimer.unref();

  const server = http.createServer(async (request, response) => {
    const context = createRequestContext(request, config, logger);
    let url;
    try {
      url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
      const parts = url.pathname.split("/").filter(Boolean);

      if (request.method === "OPTIONS") {
        if (!isAllowedOrigin(request.headers.origin, config.security)) {
          send(response, 403, { error: "origin_not_allowed" }, request, context, config.security);
          return;
        }
        send(response, 200, { ok: true }, request, context, config.security);
        return;
      }

      if (!isAllowedOrigin(request.headers.origin, config.security)) {
        send(response, 403, { error: "origin_not_allowed" }, request, context, config.security);
        return;
      }

      if (draining && !["/health", "/ready"].includes(url.pathname)) {
        send(response, 503, { ok: false, error: "server_draining" }, request, context, config.security);
        return;
      }

      if (request.method === "GET" && url.pathname === "/events") {
        if (!isAuthorized(request, config.security)) {
          response.setHeader("www-authenticate", "Bearer");
          send(response, 401, { error: "authentication_required" }, request, context, config.security);
          return;
        }
        response.writeHead(200, {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          connection: "keep-alive",
          ...(request.headers.origin && { "access-control-allow-origin": request.headers.origin }),
          "x-content-type-options": "nosniff",
          "x-request-id": context.requestId,
          vary: "Origin",
        });
        response.write(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`);
        sseClients.add(response);
        request.on("close", () => sseClients.delete(response));
        context.complete(200);
        return;
      }

      if (request.method === "GET" && url.pathname === "/health") {
        send(response, 200, {
          ok: true,
          version: config.version,
          runtimeStore: config.runtimeStore,
          authRequired: config.security.requireAuth,
          sseClients: sseClients.size,
        }, request, context, config.security);
        return;
      }

      if (request.method === "GET" && url.pathname === "/ready") {
        const result = draining
          ? {
            ok: false,
            runtimeStore: config.runtimeStore,
            checks: { configuration: "draining" },
            reason: "server_draining",
          }
          : await readiness();
        send(response, result.ok ? 200 : 503, {
          ok: result.ok,
          version: config.version,
          runtimeStore: result.runtimeStore,
          checks: result.checks,
          ...(result.reason ? { reason: result.reason } : {}),
        }, request, context, config.security);
        return;
      }

      if (!isAuthorized(request, config.security)) {
        response.setHeader("www-authenticate", "Bearer");
        send(response, 401, { error: "authentication_required" }, request, context, config.security);
        return;
      }

      const forumResponse = await handleForumRequest({
        method: request.method,
        pathname: url.pathname,
        searchParams: url.searchParams,
      });
      if (forumResponse) {
        send(response, forumResponse.status, forumResponse.body, request, context, config.security);
        return;
      }

      if (request.method === "GET" && url.pathname === "/overview") {
        send(response, 200, await runtimeReadModel.overview(), request, context, config.security);
        return;
      }

      if (request.method === "GET" && url.pathname === "/tasks") {
        send(response, 200, { tasks: await runtimeReadModel.taskList() }, request, context, config.security);
        return;
      }

      if (parts[0] === "tasks" && parts[1]) {
        let taskId;
        try {
          taskId = validateTaskId(decodeURIComponent(parts[1]));
        } catch (error) {
          send(response, 400, { error: error.code || "invalid_task_id" }, request, context, config.security);
          return;
        }
        const detail = await runtimeReadModel.taskDetail(taskId);

        if (!detail.task) {
          send(response, 404, { error: "task_not_found", taskId }, request, context, config.security);
          return;
        }

        if (request.method === "GET" && parts.length === 2) {
          send(response, 200, detail, request, context, config.security);
          return;
        }

        if (request.method === "GET" && parts.length === 3 && parts[2] === "dag") {
          send(response, 200, { workflow: detail.workflow, state: detail.dag }, request, context, config.security);
          return;
        }

        if (request.method === "GET" && parts.length === 3 && parts[2] === "approvals") {
          send(response, 200, { policy: detail.policy, risk: detail.risk, approval: detail.approval }, request, context, config.security);
          return;
        }

        if (request.method === "POST" && parts.length === 4 && parts[2] === "approvals" && ["approved", "rejected"].includes(parts[3])) {
          let payload;
          try {
            if (!isJsonContentType(request.headers["content-type"])) {
              const error = new Error("Approval payload must use application/json");
              error.code = "INVALID_CONTENT_TYPE";
              throw error;
            }
            payload = validateApprovalPayload(await parseJsonBody(request, { maxBytes: config.security.maxBodyBytes }));
          } catch (error) {
            send(response, 400, { error: error.code || "invalid_request" }, request, context, config.security);
            return;
          }
          const decision = parts[3];
          const { decidedBy, reason } = payload;

          appendAudit({ taskId, action: `approval-${decision}-requested`, actor: decidedBy, metadata: { method: request.method, path: url.pathname } });

          const child = spawn(process.execPath, [
            "scripts/governance/approval-decide.mjs",
            taskId, decision, decidedBy, reason,
          ], {
            stdio: "ignore",
            shell: false,
          });

          child.on("close", async code => {
            if (code === 0) {
              const next = (await runtimeReadModel.taskDetail(taskId)).approval;
              appendAudit({ taskId, action: `approval-${decision}`, actor: decidedBy, metadata: { method: request.method, path: url.pathname } });
              emit("approval", { taskId, decision: next?.decision, at: new Date().toISOString() });
              send(response, 200, next, request, context, config.security);
            } else {
              logger.error({ type: "control_plane.child_process_error", requestId: context.requestId, taskId, action: "approval", exitCode: code });
              send(response, 500, { error: "approval_update_failed" }, request, context, config.security);
            }
          });
          return;
        }

        if (request.method === "POST" && parts.length === 3 && parts[2] === "run") {
          appendAudit({ taskId, action: "run-requested", actor: actorFromRequest(request), metadata: { method: request.method, path: url.pathname } });
          runDetached(taskId, emit);
          send(response, 202, { accepted: true, taskId }, request, context, config.security);
          return;
        }

        if (request.method === "GET" && parts.length === 3 && parts[2] === "feedback") {
          send(response, 200, { feedback: detail.feedback }, request, context, config.security);
          return;
        }

        if (request.method === "GET" && parts.length === 3 && parts[2] === "observability") {
          send(response, 200, {
            summary: detail.observability,
            metrics: detail.metrics,
            audit: detail.audit,
            tokenCost: detail.tokenCost,
          }, request, context, config.security);
          return;
        }

        if (request.method === "GET" && parts.length === 3 && parts[2] === "console") {
          const events = [
            ...(detail.audit || []).map(item => ({ kind: "audit", at: item.timestamp, payload: item })),
            ...(detail.feedback || []).map(item => ({ kind: "feedback", at: item.createdAt, payload: item })),
            ...(detail.metrics || []).map(item => ({ kind: "metric", at: item.timestamp, payload: item })),
            ...(detail.tokenCost || []).map(item => ({ kind: "token-cost", at: item.timestamp, payload: item })),
          ].sort((a, b) => String(a.at || "").localeCompare(String(b.at || "")));
          send(response, 200, { events }, request, context, config.security);
          return;
        }
      }

      if (request.method === "GET" && url.pathname === "/evaluation/summary") {
        send(response, 200, await runtimeReadModel.evaluationSummary(), request, context, config.security);
        return;
      }

      send(response, 404, { error: "not_found" }, request, context, config.security);
    } catch (error) {
      logger.error({
        type: "http.error",
        requestId: context.requestId,
        method: request.method,
        path: url?.pathname || "/",
        error: "internal_server_error",
        code: error.code || "UNHANDLED_ERROR",
        runtimeStore: config.runtimeStore,
      });
      if (!response.headersSent) {
        send(response, 500, { error: "internal_server_error", requestId: context.requestId }, request, context, config.security);
      } else {
        response.destroy();
      }
    }
  });

  server.requestTimeout = config.requestTimeoutMs;
  server.headersTimeout = config.headersTimeoutMs;
  server.keepAliveTimeout = config.keepAliveTimeoutMs;

  async function shutdown(signal = "shutdown") {
    if (draining) return;
    draining = true;
    clearInterval(snapshotTimer);
    for (const response of sseClients) {
      try {
        response.end();
      } catch {
        // The connection may already be closed.
      }
    }
    sseClients.clear();

    await new Promise(resolveShutdown => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolveShutdown();
      };
      const timer = setTimeout(() => {
        server.closeAllConnections?.();
        finish();
      }, config.shutdownTimeoutMs);
      server.close(error => {
        clearTimeout(timer);
        if (error && error.code !== "ERR_SERVER_NOT_RUNNING") {
          logger.error({ type: "control_plane.shutdown_error", signal, error: "server_close_failed" });
        }
        finish();
      });
    });

    try {
      await closeDatabase();
    } catch {
      logger.error({ type: "control_plane.shutdown_error", signal, error: "database_close_failed" });
    }
    logger.info({ type: "control_plane.shutdown", signal });
  }

  return Object.freeze({
    server,
    config,
    sseClients,
    shutdown,
  });
}

export async function startControlPlaneServer(options = {}) {
  const app = createControlPlaneServer(options);
  try {
    await new Promise((resolveListen, rejectListen) => {
      const onError = error => {
        app.server.off("error", onError);
        rejectListen(error);
      };
      app.server.once("error", onError);
      app.server.listen(app.config.port, app.config.host, () => {
        app.server.off("error", onError);
        resolveListen();
      });
    });
  } catch (error) {
    await app.shutdown("startup_failed");
    throw error;
  }
  return app;
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === currentFile) {
  let app;
  try {
    const fileConfig = readJson(".codex/control-plane/config.json", { api: { host: "127.0.0.1", port: 4317 } });
    app = await startControlPlaneServer({
      config: createControlPlaneConfig({ fileConfig }),
    });
    console.log(`Harness Control Plane API: http://${app.config.host}:${app.config.port}`);
    console.log(`Harness SSE stream: http://${app.config.host}:${app.config.port}/events`);

    let stopping;
    const stop = signal => {
      stopping ??= app.shutdown(signal).catch(() => {
        process.exitCode = 1;
      });
      return stopping;
    };
    process.once("SIGINT", () => { void stop("SIGINT"); });
    process.once("SIGTERM", () => { void stop("SIGTERM"); });
  } catch (error) {
    console.error(JSON.stringify({
      type: "control_plane.startup_error",
      error: error.code || "startup_failed",
      message: error.message,
    }));
    process.exitCode = 1;
  }
}
