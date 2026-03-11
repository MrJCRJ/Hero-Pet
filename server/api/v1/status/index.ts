// pages/api/v1/status/index.ts
import database from "infra/database";
import pkg from "package.json";
import { httpHandler } from "src/server/core/httpHandler";

interface StatusContext {
  res: { setHeader: (name: string, value: string) => void };
}

async function statusHandler({ res }: StatusContext): Promise<Record<string, unknown>> {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, private",
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  const updated_at = new Date().toISOString();
  const timings: Record<string, number> = {};
  const time = async (
    label: string,
    fn: () => Promise<unknown>,
  ): Promise<unknown> => {
    const start = performance.now();
    const result = await fn();
    timings[label] = +(performance.now() - start).toFixed(2);
    return result;
  };

  let postgresVersion: { rows: { server_version: string }[] };
  let maxConnections: { rows: { max_connections: string }[] };
  let currentConnections: { rows: { count: number }[] };

  try {
    postgresVersion = (await time("version", () =>
      database.query("SHOW server_version;"),
    )) as typeof postgresVersion;
    maxConnections = (await time("max_connections", () =>
      database.query("SHOW max_connections;"),
    )) as typeof maxConnections;
    const databaseName = process.env.POSTGRES_DB;
    currentConnections = (await time("current_connections", () =>
      database.query({
        text: "SELECT COUNT(*)::int FROM pg_stat_activity WHERE datname = $1;",
        values: [databaseName],
      }),
    )) as typeof currentConnections;
  } catch (err) {
    const e = new Error("Database unreachable") as Error & {
      code?: string;
      publicMessage?: string;
    };
    e.code = "DEPENDENCY_UNAVAILABLE";
    e.publicMessage = "Database not reachable";
    throw e;
  }

  const databaseDep = {
    status: "healthy",
    version: postgresVersion.rows[0].server_version,
    max_connections: parseInt(maxConnections.rows[0].max_connections, 10),
    current_connections: currentConnections.rows[0].count,
    latency: timings,
  };
  const webserverDep = {
    status: "healthy",
    provider: process.env.VERCEL ? "vercel" : "local",
    environment: process.env.NODE_ENV || "development",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    version: (pkg as { version?: string }).version,
  };
  const statuses = [databaseDep.status, webserverDep.status];
  let overall = "healthy";
  if (statuses.some((s) => ["unreachable", "offline", "error"].includes(s)))
    overall = "offline";
  else if (statuses.some((s) => s !== "healthy")) overall = "degraded";

  return {
    updated_at,
    dependencies: {
      database: databaseDep,
      webserver: webserverDep,
      overall,
    },
  };
}

export default httpHandler(statusHandler, { methods: ["GET"] });
