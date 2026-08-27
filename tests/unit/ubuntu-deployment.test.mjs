import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CONTROL_PLANE_SECRET_KEYS,
  renderSystemdEnvironment,
  validateSecretDocument,
} from "../../deploy/ubuntu/bin/secret-runtime.mjs";
import {
  buildVectorSecretResponse,
  parseVectorSecretRequest,
} from "../../deploy/ubuntu/bin/read-audit-secret.mjs";
import { runAuditShipper } from "../../deploy/ubuntu/bin/run-audit-shipper.mjs";
import {
  assertSafeBackupDirectory,
  backupFilePath,
  buildPostgresEnvironment,
  parseDatabaseConnection,
  sha256File,
  verifyBackup,
} from "../../deploy/ubuntu/bin/postgres-backup.mjs";
import {
  assertSafeDataPath,
  buildResticBackupArgs,
  buildResticRestoreArgs,
  validateSnapshotName,
} from "../../deploy/ubuntu/bin/restic-backup.mjs";
import { validateDeploymentTarget } from "../../deploy/ubuntu/bin/validate-target.mjs";

describe("Ubuntu deployment target", () => {
  it("validates the checked-in target contract", () => {
    expect(validateDeploymentTarget()).toMatchObject({
      ok: true,
      target: { id: "ubuntu-24.04-single-host" },
      files: 10,
    });
  });

  it("allow-lists and safely renders encrypted runtime secrets", () => {
    const secrets = {
      HARNESS_CONTROL_PLANE_TOKEN: "token-with-\\-and-\"quote",
      HARNESS_CONTROL_PLANE_ORIGINS: "https://control.example",
      HARNESS_DATABASE_URL: "postgres://harness:password@db.example/harness?sslmode=require",
    };
    const rendered = renderSystemdEnvironment(secrets, {
      required: CONTROL_PLANE_SECRET_KEYS,
      allowed: CONTROL_PLANE_SECRET_KEYS,
    });
    expect(rendered).toContain("HARNESS_CONTROL_PLANE_TOKEN=");
    expect(rendered).toContain("HARNESS_DATABASE_URL=");
    expect(() => validateSecretDocument({ ...secrets, SECRET_LEAK: "no" }, {
      required: CONTROL_PLANE_SECRET_KEYS,
      allowed: CONTROL_PLANE_SECRET_KEYS,
    })).toThrow("unsupported key");
    expect(() => validateSecretDocument({ HARNESS_DATABASE_URL: "x" }, {
      required: CONTROL_PLANE_SECRET_KEYS,
      allowed: CONTROL_PLANE_SECRET_KEYS,
    })).toThrow("Required secret");
  });

  it("only exposes allow-listed audit values through the Vector secret protocol", () => {
    const request = parseVectorSecretRequest({
      version: "1.0",
      secrets: ["HARNESS_AUDIT_SINK_URL", "HARNESS_AUDIT_SINK_TOKEN"],
    });
    expect(buildVectorSecretResponse(request, {
      HARNESS_AUDIT_SINK_URL: "https://audit.example.test/ingest",
      HARNESS_AUDIT_SINK_TOKEN: "audit-token",
    })).toEqual({
      HARNESS_AUDIT_SINK_URL: {
        value: "https://audit.example.test/ingest",
        error: null,
      },
      HARNESS_AUDIT_SINK_TOKEN: {
        value: "audit-token",
        error: null,
      },
    });
    expect(() => parseVectorSecretRequest({
      version: "1.0",
      secrets: ["HARNESS_DATABASE_URL"],
    })).toThrow("unsupported secret");
  });

  it("scrubs audit credentials before starting Vector", async () => {
    const child = new EventEmitter();
    let spawnOptions;
    const promise = runAuditShipper({
      command: "vector",
      configPath: "/etc/vector/harness-audit.toml",
      environment: {
        HARNESS_AUDIT_SINK_URL: "https://audit.example.test/ingest",
        HARNESS_AUDIT_SINK_TOKEN: "audit-token",
        SOPS_AGE_KEY_FILE: "/etc/harness/age/keys.txt",
      },
      spawnFile: (_command, _args, options) => {
        spawnOptions = options;
        queueMicrotask(() => child.emit("close", 0));
        return child;
      },
    });
    await expect(promise).resolves.toBe(0);
    expect(spawnOptions.env).not.toHaveProperty("HARNESS_AUDIT_SINK_URL");
    expect(spawnOptions.env).not.toHaveProperty("HARNESS_AUDIT_SINK_TOKEN");
    expect(spawnOptions.env.SOPS_AGE_KEY_FILE).toBe("/etc/harness/age/keys.txt");
  });

  it("keeps database credentials out of child command arguments", () => {
    const connection = parseDatabaseConnection("postgres://harness:p%40ss@db.example:5432/harness?sslmode=require");
    const environment = buildPostgresEnvironment(connection, "/tmp/harness-pgpass");
    expect(environment.PGPASSFILE).toBe("/tmp/harness-pgpass");
    expect(environment.PGPASSWORD).toBeUndefined();
    expect(environment.PGSSLMODE).toBe("require");
    expect(backupFilePath("/var/lib/harness/backups", new Date("2026-08-27T04:00:00.000Z")))
      .toBe("/var/lib/harness/backups/harness-20260827T040000Z.dump");
    expect(() => assertSafeBackupDirectory("/"))
      .toThrow("filesystem root");
  });

  it("requires checksummed backups and safe restore paths", async () => {
    const directory = await fs.mkdtemp(join(tmpdir(), `harness-backup-${randomUUID()}-`));
    try {
      const backupPath = join(directory, "harness-test.dump");
      await fs.writeFile(backupPath, "backup payload", "utf8");
      const checksum = await sha256File(backupPath);
      await fs.writeFile(`${backupPath}.sha256`, `${checksum}  harness-test.dump\n`, "utf8");

      await expect(verifyBackup(backupPath, { backupDirectory: directory }))
        .resolves.toMatchObject({ backupPath, checksum });
      await expect(verifyBackup(join(directory, "..", "outside.dump"), { backupDirectory: directory }))
        .rejects.toThrow("outside the backup directory");
      expect(() => buildResticRestoreArgs("latest", "/"))
        .toThrow("filesystem root");
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }
  });

  it("constrains restic snapshot and path arguments", () => {
    expect(validateSnapshotName("latest")).toBe("latest");
    expect(buildResticBackupArgs({
      backupPath: "/var/lib/harness/backups",
      auditPath: "/var/lib/harness/audit",
    })).toEqual([
      "backup",
      "/var/lib/harness/backups",
      "/var/lib/harness/audit",
      "--tag",
      "harness-control-plane",
    ]);
    expect(() => validateSnapshotName("../../etc")).toThrow("Snapshot name is invalid");
    expect(() => assertSafeDataPath("relative/path")).toThrow("must be absolute");
  });
});
