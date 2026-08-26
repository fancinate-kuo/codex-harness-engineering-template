import readline from "node:readline";

export class JsonRpcClient {
  constructor(child) {
    this.child = child;
    this.nextId = 1;
    this.pending = new Map();
    this.notifications = [];
    this.handlers = new Set();

    const rl = readline.createInterface({
      input: child.stdout,
      crlfDelay: Infinity
    });

    rl.on("line", line => {
      if (!line.trim()) return;

      let message;
      try {
        message = JSON.parse(line);
      } catch {
        return;
      }

      if (message.id != null && (message.result !== undefined || message.error !== undefined)) {
        const pending = this.pending.get(message.id);
        if (pending) {
          this.pending.delete(message.id);
          if (message.error) pending.reject(new Error(JSON.stringify(message.error)));
          else pending.resolve(message.result);
        }
        return;
      }

      this.notifications.push(message);
      for (const handler of this.handlers) {
        try { handler(message); } catch {}
      }
    });
  }

  sendRaw(message) {
    this.child.stdin.write(JSON.stringify(message) + "\n");
  }

  notify(method, params = {}) {
    this.sendRaw({ method, params });
  }

  request(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.sendRaw({ id, method, params });
    });
  }

  onMessage(handler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }
}
