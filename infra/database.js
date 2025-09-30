import { Client, Pool } from "pg";
// IMPORTANTE: "node-pg-migrate" em ambiente ESM (Node 20) pode retornar um objeto cujo
// runner real está em .default. O import default puro acaba produzindo um objeto
// (com chaves PgLiteral, Migration, PgType, default) e não a função diretamente,
// causando erro "migrationRunner is not a function" quando chamado.
// Para manter compatibilidade CJS/ESM usamos fallback para .default.
import pgMigrate from "node-pg-migrate";
import { join } from "node:path";

// --- Pool singleton ---
let pool;
function getOrInitPool() {
  if (!pool) {
    pool = new Pool({
      host: process.env.POSTGRES_HOST || "localhost",
      port: Number(process.env.POSTGRES_PORT) || 5432,
      user: process.env.POSTGRES_USER || "postgres",
      database: process.env.POSTGRES_DB || "hero_pet",
      password: process.env.POSTGRES_PASSWORD || "postgres",
      ssl: getSSLValues(),
      max: Number(process.env.PG_POOL_MAX || 10),
      idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT || 30000),
      connectionTimeoutMillis: Number(process.env.PG_CONN_TIMEOUT || 5000),
    });
    pool.on("error", (err) => {
      console.error("Postgres pool error (idle client):", err.message);
    });
  }
  return pool;
}

async function query(queryObject) {
  const client = await getClient();
  try {
    const res = await client.query(queryObject);
    return res;
  } catch (error) {
    console.error("Error querying database:", error);
    throw error;
  } finally {
    client.release();
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
  // Mantido para compatibilidade (casos específicos que precisem de client isolado)
  const client = new Client({
    host: process.env.POSTGRES_HOST || "localhost",
    port: Number(process.env.POSTGRES_PORT) || 5432,
    user: process.env.POSTGRES_USER || "postgres",
    database: process.env.POSTGRES_DB || "hero_pet",
    password: process.env.POSTGRES_PASSWORD || "postgres",
    ssl: getSSLValues(),
  });
  await connectWithRetry(client);
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

// retorna client do pool (para transações) já conectado
async function getClient() {
  const p = getOrInitPool();
  // Realiza migrações na primeira vez que alguém pegar client do pool
  if (!MIGRATIONS_ENSURED) {
    // Cria client temporário para migrations (evita segurar slot do pool se demorar)
    const temp = new Client({
      host: process.env.POSTGRES_HOST || "localhost",
      port: Number(process.env.POSTGRES_PORT) || 5432,
      user: process.env.POSTGRES_USER || "postgres",
      database: process.env.POSTGRES_DB || "hero_pet",
      password: process.env.POSTGRES_PASSWORD || "postgres",
      ssl: getSSLValues(),
    });
    try {
      await connectWithRetry(temp);
      await ensureMigrationsIfEnabledOnce(temp);
    } catch (err) {
      console.warn(
        "Falha migrations via pool init (continuando):",
        err.message,
      );
    } finally {
      try {
        await temp.end();
      } catch (_) {
        /* noop */
      }
    }
  }
  const client = await p.connect();
  return client;
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
      const migrationRunner = pgMigrate?.default || pgMigrate; // compat layer
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

// --- Retry helper ---
async function connectWithRetry(client) {
  const max = Number(process.env.PG_CONN_RETRY_MAX || 5);
  for (let attempt = 1; attempt <= max; attempt++) {
    try {
      await client.connect();
      if (attempt > 1) {
        console.info(`Postgres connect OK após retry #${attempt}`);
      }
      return;
    } catch (err) {
      const isLast = attempt === max;
      const delay = 200 * 2 ** (attempt - 1); // exponencial simples
      console.warn(
        `Falha conexão Postgres (tentativa ${attempt}/${max}): ${err.code || err.message} - aguardando ${delay}ms`,
      );
      if (isLast) {
        console.error(
          "Excedido número máximo de tentativas de conexão Postgres",
        );
        throw err;
      }
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}
