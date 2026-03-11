/**
 * Executa migrações diretamente via node-pg-migrate (sem passar pela API).
 * Útil em testes que fazem DROP SCHEMA e precisam recriar o schema antes de ter usuários.
 */
import pgMigrate from "node-pg-migrate";
import { join } from "path";
import database from "infra/database.js";

const MIGRATIONS_DIR = join(process.cwd(), "infra", "migrations");
const MIGRATIONS_TABLE = "pgmigrations";

export async function runMigrations() {
  const client = await database.getNewClient();
  try {
    const runner = pgMigrate?.default || pgMigrate;
    await runner({
      direction: "up",
      verbose: false,
      dryRun: false,
      dbClient: client,
      dir: MIGRATIONS_DIR,
      migrationsTable: MIGRATIONS_TABLE,
    });
  } finally {
    try {
      await client.end();
    } catch {
      /* noop */
    }
  }
}
