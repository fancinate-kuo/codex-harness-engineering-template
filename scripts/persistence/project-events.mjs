import { loadEvents } from "./lib/event-store.mjs";
import { closePool } from "./lib/db.mjs";

const taskId=process.argv[2] || null;
const after=Number(process.argv[3] || 0);

try {
  const events=await loadEvents(taskId,after);
  console.log(JSON.stringify(events,null,2));
} catch(err) {
  console.error(err.stack||err.message);
  process.exitCode=1;
} finally {
  await closePool();
}
