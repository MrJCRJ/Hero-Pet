import migrationRunner from "node-pg-migrate";
import { join } from "node:path";
import database from "infra/database.js";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

const ALLOWED_METHODS = ["GET", "POST"];
const MIGRATIONS_DIR = join("infra", "migrations");
const MIGRATIONS_TABLE = "pgmigrations";

const DEFAULT_MIGRATION_OPTIONS = {
  direction: "up" as const,
  verbose: true,
};

async function runMigrations(
  dbClient: any,
  dryRun = true
): Promise<unknown[]> {
  return migrationRunner({
    ...DEFAULT_MIGRATION_OPTIONS,
    dbClient,
    dryRun,
    dir: MIGRATIONS_DIR,
    migrationsTable: MIGRATIONS_TABLE,
  }) as Promise<unknown[]>;
}

function determineStatus(method: string, migrations: unknown[]): number {
  if (method === "POST" && migrations.length > 0) {
    return 201;
  }
  return 200;
}

export default async function migrations(
  request: ApiReqLike,
  response: ApiResLike
): Promise<void> {
  if (!ALLOWED_METHODS.includes(request.method)) {
    response.status(405).json({
      error: `Method "${request.method}" not allowed`,
    });
    return;
  }

  let dbClient: unknown;
  try {
    dbClient = await database.getNewClient();

    const dryRun = request.method === "GET";
    const migrationsResult = (await runMigrations(dbClient, dryRun)) as unknown[];

    const statusCode = determineStatus(request.method, migrationsResult);

    response.status(statusCode).json(migrationsResult);
  } catch (error: unknown) {
    console.error("Migration error:", error);
    const err = error as { message?: string; code?: string };
    response.status(500).json({
      error: "Internal server error during migration process",
      message: err?.message,
      code: err?.code,
    });
  } finally {
    const client = dbClient as { end?: () => Promise<void> };
    if (client && typeof client.end === "function") {
      await client.end();
    }
  }
}
