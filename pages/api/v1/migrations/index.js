import migrationRunner from "node-pg-migrate";
import { join } from "node:path";
import database from "infra/database.js";

const ALLOWED_METHODS = ["GET", "POST"];
const MIGRATIONS_DIR = join("infra", "migrations");
const MIGRATIONS_TABLE = "pgmigrations";

const DEFAULT_MIGRATION_OPTIONS = {
  direction: "up",
  verbose: true,
};

async function runMigrations(dbClient, dryRun = true) {
  return migrationRunner({
    ...DEFAULT_MIGRATION_OPTIONS,
    dbClient,
    dryRun,
    dir: MIGRATIONS_DIR,
    migrationsTable: MIGRATIONS_TABLE,
  });
}

function determineStatus(method, migrations) {
  if (method === "POST" && migrations.length > 0) {
    return 201;
  }
  return 200;
}

export default async function migrations(request, response) {
  if (!ALLOWED_METHODS.includes(request.method)) {
    return response.status(405).json({
      error: `Method "${request.method}" not allowed`,
    });
  }

  let dbClient;
  try {
    dbClient = await database.getNewClient();

    const dryRun = request.method === "GET";
    const migrationsResult = await runMigrations(dbClient, dryRun);

    const statusCode = determineStatus(request.method, migrationsResult);

    return response.status(statusCode).json(migrationsResult);
  } catch (error) {
    console.error("Migration error:", error);
    return response.status(500).json({
      error: "Internal server error during migration process",
      message: error?.message,
      code: error?.code,
    });
  } finally {
    if (dbClient) {
      await dbClient.end();
    }
  }
}
