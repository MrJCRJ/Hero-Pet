// pages/api/v1/status/index.js
import database from "infra/database";
import pkg from "package.json";
import { httpHandler } from "src/server/core/httpHandler";

async function statusHandler({ res }) {
  // Adicionar cabeçalhos de cache
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, private",
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  const updated_at = new Date().toISOString();
  const timings = {};
  const time = async (label, fn) => {
    const start = performance.now();
    const result = await fn();
    timings[label] = +(performance.now() - start).toFixed(2);
    return result;
  };

  let postgresVersion, maxConnections, currentConnections;
  try {
    postgresVersion = await time("version", () =>
      database.query("SHOW server_version;"),
    );
    maxConnections = await time("max_connections", () =>
      database.query("SHOW max_connections;"),
    );
    const databaseName = process.env.POSTGRES_DB;
    currentConnections = await time("current_connections", () =>
      database.query({
        text: "SELECT COUNT(*)::int FROM pg_stat_activity WHERE datname = $1;",
        values: [databaseName],
      }),
    );
  } catch (err) {
    const e = new Error("Database unreachable");
    e.code = "DEPENDENCY_UNAVAILABLE";
    e.publicMessage = "Database not reachable";
    throw e;
  }

  const databaseDep = {
    status: "healthy",
    version: postgresVersion.rows[0].server_version,
    max_connections: parseInt(maxConnections.rows[0].max_connections),
    current_connections: currentConnections.rows[0].count,
    latency: timings,
  };
  const webserverDep = {
    status: "healthy",
    provider: process.env.VERCEL ? "vercel" : "local",
    environment: process.env.NODE_ENV || "development",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    version: pkg.version,
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
