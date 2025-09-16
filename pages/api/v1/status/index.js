// pages/api/v1/status/index.js
import database from "infra/database";
import pkg from "package.json";

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

  let postgresVersion, maxConnections, currentConnections;
  const attempts = [];
  const runWithTiming = async (label, fn) => {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    timings[label] = end - start;
    return result;
  };

  const MAX_RETRIES = 3;
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      postgresVersion = await runWithTiming('first_query', () => database.query('SHOW server_version;'));
      maxConnections = await runWithTiming('second_query', () => database.query('SHOW max_connections;'));
      const databaseName = process.env.POSTGRES_DB;
      currentConnections = await runWithTiming('third_query', () => database.query({
        text: 'SELECT COUNT(*)::int FROM pg_stat_activity WHERE datname = $1;',
        values: [databaseName],
      }));
      break; // sucesso -> sai do loop
    } catch (err) {
      attempts.push({ attempt: i + 1, error: err.message });
      if (i === MAX_RETRIES - 1) {
        console.error('Status DB check failed after retries:', attempts.map(a => a.error).join(' | '));
        response.setHeader('Cache-Control', 'no-store');
        return response.status(503).json({
          method_received: request.method,
          updated_at: new Date().toISOString(),
          dependencies: {
            database: {
              status: 'unreachable',
              error: attempts[attempts.length - 1].error || 'Unknown',
              attempts,
              host: process.env.POSTGRES_HOST,
              port: process.env.POSTGRES_PORT,
            },
            webserver: {
              status: 'healthy',
              provider: process.env.VERCEL ? 'vercel' : 'local',
              environment: process.env.NODE_ENV || 'development',
              aws_region: process.env.AWS_REGION || null,
              vercel_region: process.env.VERCEL_REGION || null,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              version: pkg.version,
            },
          },
        });
      }
      // backoff simples
      await new Promise(r => setTimeout(r, 120 * (i + 1)));
    }
  }

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
        current_connections: currentConnections.rows[0].count,
        opened_connections: currentConnections.rows[0].count,
        latency: timings,
      },
      webserver: {
        status: "healthy",
        provider: process.env.VERCEL ? "vercel" : "local",
        environment: process.env.NODE_ENV || "development",
        aws_region: process.env.AWS_REGION || null,
        vercel_region: process.env.VERCEL_REGION || null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        version: pkg.version,
      },
    },
  });
}

export default status;
