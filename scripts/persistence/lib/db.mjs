import pg from "pg";
const { Pool } = pg;

let pool;

export function databaseUrl() {
  return process.env.HARNESS_DATABASE_URL || null;
}

export function isDatabaseEnabled() {
  return Boolean(databaseUrl());
}

export function getPool() {
  if (!databaseUrl()) {
    throw new Error("HARNESS_DATABASE_URL is not set");
  }
  if (!pool) {
    pool = new Pool({
      connectionString: databaseUrl(),
      max: Number(process.env.HARNESS_DB_POOL_MAX || 10)
    });
  }
  return pool;
}

export async function query(text, params=[]) {
  return getPool().query(text, params);
}

export async function transaction(fn) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
