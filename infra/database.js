import { Client } from "pg";
import migrationRunner from "node-pg-migrate";
import { join } from "node:path";

async function query(queryObject) {
  let client;

  try {
    client = await getNewClient();
    const result = await client.query(queryObject);
    return result;
  } catch (error) {
    console.error("Error connecting to the database:", error);
    throw error;
  } finally {
    // Só encerra se a conexão foi estabelecida
    if (client) {
      try {
        await client.end();
      } catch (endErr) {
        // log silencioso para não mascarar erro original
        console.warn("Falha ao encerrar conexão PG:", endErr.message);
      }
    }
  }
}

const database = {
  query,
  getNewClient,
  getClient,
  safeRollback,
};

export default database;

async function getNewClient() {
  const client = new Client({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    user: process.env.POSTGRES_USER,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    ssl: getSSLValues(),
  });

  await client.connect();
  await ensureMigrationsIfEnabledOnce(client);
  return client;
}

function getSSLValues() {
  if (process.env.POSTGRES_CA) {
    return {
      ca: process.env.POSTGRES_CA,
    };
  }

  return process.env.NODE_ENV === "production" ? true : false;
}

// retorna um client conectado para transações manuais (BEGIN/COMMIT/ROLLBACK)
async function getClient() {
  return await getNewClient();
}

async function safeRollback(client) {
  if (!client) return;
  try {
    await client.query("ROLLBACK");
  } catch (_) {
    // noop
  }
}

// --- Auto-apply de migrações (opcional) ---
const MIGRATIONS_DIR = join("infra", "migrations");
const MIGRATIONS_TABLE = "pgmigrations";
let MIGRATIONS_ENSURED = false;
let MIGRATIONS_ENSURING = null;

async function ensureMigrationsIfEnabledOnce(client) {
  const flag = String(process.env.MIGRATIONS_AUTO_APPLY || "").trim();
  if (!flag || flag === "0" || flag.toLowerCase() === "false") return;
  if (MIGRATIONS_ENSURED) return;
  if (MIGRATIONS_ENSURING) {
    try {
      await MIGRATIONS_ENSURING;
    } catch (_) {
      // noop
    }
    return;
  }
  MIGRATIONS_ENSURING = (async () => {
    try {
      await migrationRunner({
        direction: "up",
        verbose: true,
        dryRun: false,
        dbClient: client,
        dir: MIGRATIONS_DIR,
        migrationsTable: MIGRATIONS_TABLE,
      });
      MIGRATIONS_ENSURED = true;
    } catch (err) {
      // Não derruba a app por causa do auto-apply: mantém comportamento opcional
      console.warn(
        "Auto-migrate falhou (continuando sem interromper):",
        err?.message || err,
      );
    } finally {
      MIGRATIONS_ENSURING = null;
    }
  })();
  try {
    await MIGRATIONS_ENSURING;
  } catch (_) {
    // noop
  }
}
