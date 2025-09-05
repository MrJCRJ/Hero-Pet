// pages/api/v1/status/index.js
import database from "infra/database";

async function status(request, response) {
  // 🔹 Adiciona headers de CORS
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // 🔹 Responde OPTIONS imediatamente (pré-flight CORS)
  if (request.method === "OPTIONS") {
    return response.status(200).end();
  }

  // 🔹 Log do método recebido
  console.log(`Método recebido: ${request.method}`);

  // 🔹 Começa a medir latência das queries
  const timings = {};

  const start1 = performance.now();
  const postgresVersion = await database.query("SHOW server_version;");
  const end1 = performance.now();
  timings.first_query = end1 - start1;

  const start2 = performance.now();
  const maxConnections = await database.query("SHOW max_connections;");
  const end2 = performance.now();
  timings.second_query = end2 - start2;

  const databaseName = process.env.POSTGRES_DB;
  const start3 = performance.now();
  const currentConnections = await database.query({
    text: "SELECT COUNT(*)::int FROM pg_stat_activity WHERE datname = $1;",
    values: [databaseName],
  });
  const end3 = performance.now();
  timings.third_query = end3 - start3;

  const updatedAt = new Date().toISOString();

  response.setHeader("Cache-Control", "no-store");

  // 🔹 Monta resposta
  response.status(200).json({
    method_received: request.method,
    updated_at: updatedAt,
    dependencies: {
      database: {
        status: "healthy",
        version: postgresVersion.rows[0].server_version,
        max_connections: parseInt(maxConnections.rows[0].max_connections),
        current_connections: currentConnections.rows[0].count, // ✅ compatível com teste
        opened_connections: currentConnections.rows[0].count, // sua nova propriedade
        latency: timings,
      },
      webserver: {
        status: "healthy",
        provider: process.env.VERCEL ? "vercel" : "local",
        environment: process.env.NODE_ENV || "development",
        aws_region: process.env.AWS_REGION || null,
        vercel_region: process.env.VERCEL_REGION || null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        last_commit_author: process.env.LAST_COMMIT_AUTHOR || null,
        last_commit_message: process.env.LAST_COMMIT_MESSAGE || null,
        last_commit_message_sha: process.env.LAST_COMMIT_SHA || null,
        version: process.env.WEBSERVER_VERSION || "v1.0.0",
      },
    },
  });
}

export default status;
