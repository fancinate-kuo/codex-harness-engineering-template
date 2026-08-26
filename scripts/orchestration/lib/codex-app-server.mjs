import { spawn } from "node:child_process";
import fs from "node:fs";
import { JsonRpcClient } from "./codex-protocol.mjs";

function loadConfig() {
  return JSON.parse(
    fs.readFileSync(".codex/orchestration/codex.json", "utf8")
  );
}

export class CodexAppServer {
  constructor() {
    this.config = loadConfig();
    this.child = null;
    this.rpc = null;
  }

  async start() {
    const binary = this.config.binary || "codex";
    const args = this.config.appServerArgs || ["app-server"];

    this.child = spawn(binary, args, {
      stdio: ["pipe", "pipe", "pipe"],
      shell: process.platform === "win32"
    });

    this.child.stderr.on("data", chunk => {
      process.stderr.write(chunk);
    });

    this.rpc = new JsonRpcClient(this.child);

    const init = await this.rpc.request("initialize", {
      clientInfo: this.config.clientInfo
    });

    this.rpc.notify("initialized", {});

    return init;
  }

  async startThread({ cwd }) {
    const params = {
      cwd,
      sandbox: this.config.sandbox,
      approvalPolicy: this.config.approvalPolicy
    };

    if (this.config.model) params.model = this.config.model;

    return await this.rpc.request("thread/start", params);
  }

  async resumeThread({ threadId }) {
    return await this.rpc.request("thread/resume", {
      threadId
    });
  }

  async startTurn({ threadId, text }) {
    return await this.rpc.request("turn/start", {
      threadId,
      input: [
        {
          type: "text",
          text
        }
      ]
    });
  }

  async stop() {
    if (!this.child) return;
    this.child.kill();
    this.child = null;
    this.rpc = null;
  }
}
