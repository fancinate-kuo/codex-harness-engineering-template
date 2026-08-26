import fs from "node:fs";
import { upsertTask } from "./lib/repository.mjs";
import { query, closePool } from "./lib/db.mjs";

try {
  const queue=JSON.parse(fs.readFileSync(".codex/orchestration/queue/tasks.json","utf8"));
  for(const task of queue.tasks||[]) {
    await upsertTask(task);
  }

  const index=JSON.parse(fs.readFileSync(".codex/memory/index.json","utf8"));
  for(const item of index.records||[]) {
    if(!fs.existsSync(item.file)) continue;
    const r=JSON.parse(fs.readFileSync(item.file,"utf8"));
    await query(
      `INSERT INTO harness.memory_records
        (id,kind,title,content,tags,scope,source,confidence,status,expires_at,supersedes,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (id) DO UPDATE SET
        kind=EXCLUDED.kind,title=EXCLUDED.title,content=EXCLUDED.content,
        tags=EXCLUDED.tags,scope=EXCLUDED.scope,source=EXCLUDED.source,
        confidence=EXCLUDED.confidence,status=EXCLUDED.status,
        expires_at=EXCLUDED.expires_at,supersedes=EXCLUDED.supersedes,
        updated_at=EXCLUDED.updated_at`,
      [
        r.id,r.kind,r.title,r.content,
        JSON.stringify(r.tags||[]),JSON.stringify(r.scope||{}),JSON.stringify(r.source||{}),
        r.confidence,r.status,r.expiresAt||null,r.supersedes||null,r.createdAt,r.updatedAt
      ]
    );
  }

  console.log("Seed complete.");
} catch(err) {
  console.error(err.stack||err.message);
  process.exitCode=1;
} finally {
  await closePool();
}
