import pg from "pg";
const { Pool } = pg;

let pool;

const DEFAULT_DB_POOL_MAX = 10;
const DEFAULT_DB_CONNECTION_TIMEOUT_MS = 5_000;
const DEFAULT_DB_IDLE_TIMEOUT_MS = 10_000;

function databaseConfigError(message) {
  const error = new Error(message);
  error.code = "INVALID_DATABASE_CONFIG";
  return error;
}

function boundedInteger(value, name, { fallback, minimum, maximum }) {
  const candidate = value ?? fallback;
  const parsed = Number(candidate);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw databaseConfigError(
      `${name} must be an integer between ${minimum} and ${maximum}`,
    );
  }
  return parsed;
}

export function databaseUrl(environment = process.env) {
  return environment.HARNESS_DATABASE_URL?.trim() || null;
}

export function isDatabaseEnabled(environment = process.env) {
  return Boolean(databaseUrl(environment));
}

export function getDatabaseConfig(environment = process.env) {
  return Object.freeze({
    connectionString: databaseUrl(environment),
    max: boundedInteger(environment.HARNESS_DB_POOL_MAX, "HARNESS_DB_POOL_MAX", {
      fallback: DEFAULT_DB_POOL_MAX,
      minimum: 1,
      maximum: 100,
    }),
    connectionTimeoutMillis: boundedInteger(
      environment.HARNESS_DB_CONNECTION_TIMEOUT_MS,
      "HARNESS_DB_CONNECTION_TIMEOUT_MS",
      { fallback: DEFAULT_DB_CONNECTION_TIMEOUT_MS, minimum: 100, maximum: 120_000 },
    ),
    idleTimeoutMillis: boundedInteger(
      environment.HARNESS_DB_IDLE_TIMEOUT_MS,
      "HARNESS_DB_IDLE_TIMEOUT_MS",
      { fallback: DEFAULT_DB_IDLE_TIMEOUT_MS, minimum: 0, maximum: 600_000 },
    ),
  });
}

export function getPool(environment = process.env) {
  const config = getDatabaseConfig(environment);
  if (!config.connectionString) {
    throw new Error("HARNESS_DATABASE_URL is not set");
  }
  if (!pool) {
    pool = new Pool(config);
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
