const axios = require("axios");
const next = require("next");
const http = require("http");
const net = require("net");
const path = require("path");
const fs = require("fs");

/** Bloqueia execução se testes usariam banco de prod/dev (muitos fazem DROP SCHEMA) */
function guardDestructiveDb() {
  const host = process.env.POSTGRES_HOST || "";
  const db = process.env.POSTGRES_DB || "hero_pet";
  const isCloud =
    host.includes("neon.tech") ||
    host.includes("aws") ||
    host.includes("supabase") ||
    (host && !host.includes("localhost") && !host.includes("127.0.0.1"));
  const isTestDb = db.endsWith("_test") || db === "hero_pet_test";
  if (isCloud && !isTestDb) {
    const msg = [
      "\n=== BLOQUEADO: Testes não podem rodar em banco de produção/cloud ===",
      `Conectado a: ${host} / ${db}`,
      "Os testes fazem DROP SCHEMA e APAGAM TODOS OS DADOS.",
      "",
      "Solução: crie .env.test com banco de testes separado.",
      "  cp .env.test.sample .env.test",
      "  Ajuste POSTGRES_DB=hero_pet_test (ou neondb_test no Neon)",
      "",
      "Depois rode: npm test",
      "========================================\n",
    ].join("\n");
    throw new Error(msg);
  }
}

module.exports = async () => {
  guardDestructiveDb();
  const testPort = Number(process.env.TEST_PORT || 3100);
  const baseUrl = process.env.BASE_URL || `http://localhost:${testPort}`;
  const statusUrl = `${baseUrl}/api/v1/status`;
  const migrateUrl = `${baseUrl}/api/v1/migrations`;

  // 1) Probe: se a porta de teste estiver ocupada, tentamos reutilizar
  const portInUse = await new Promise((resolve) => {
    const tester = net
      .createServer()
      .once("error", (err) => {
        if (err && (err.code === "EADDRINUSE" || err.code === "EACCES")) {
          resolve(true);
        } else {
          resolve(false);
        }
      })
      .once("listening", () => {
        tester.close(() => resolve(false));
      })
      .listen(testPort);
  });

  if (portInUse) {
    try {
      await axios.get(statusUrl, { timeout: 1500 });
      console.log(
        `[globalSetup] Porta ${testPort} em uso — reutilizando servidor Next existente`,
      );
      try {
        const res = await axios.post(migrateUrl, {}, { timeout: 8000 });
        console.log(
          "[globalSetup] Migrações aplicadas (reutilizado)",
          res.status,
        );
      } catch (e) {
        console.log(
          "[globalSetup] Aviso: falha ao aplicar migrações (reutilizado):",
          e?.response?.status || e.message,
        );
      }
      return;
    } catch (_) {
      console.log(
        `[globalSetup] Porta ${testPort} ocupada mas /status indisponível — seguindo para iniciar Next`,
      );
    }
  } else {
    // Checagem http direta pode ser mais rápida quando servidor já está pronto
    try {
      await axios.get(statusUrl, { timeout: 1200 });
      console.log(
        `[globalSetup] Reutilizando servidor Next existente na porta ${testPort}`,
      );
      try {
        const res = await axios.post(migrateUrl, {}, { timeout: 8000 });
        console.log(
          "[globalSetup] Migrações aplicadas (reutilizado)",
          res.status,
        );
      } catch (e) {
        console.log(
          "[globalSetup] Aviso: falha ao aplicar migrações (reutilizado):",
          e?.response?.status || e.message,
        );
      }
      return;
    } catch (_) {
      console.log(
        "[globalSetup] Nenhum servidor detectado; iniciando instância de teste...",
      );
    }
  }

  const dev = true;
  const app = next({ dev });
  await app.prepare();
  const handle = app.getRequestHandler();

  const server = http.createServer((req, res) => handle(req, res));
  await new Promise((resolve, reject) => {
    server.on("error", (err) => {
      if (err && err.code === "EADDRINUSE") {
        console.log(
          `[globalSetup] Detected EADDRINUSE on ${testPort} during listen — assumindo servidor externo e reutilizando`,
        );
        resolve();
      } else {
        reject(err);
      }
    });
    server.listen(testPort, resolve);
  });

  global.__NEXT_TEST_SERVER__ = server;
  global.__NEXT_TEST_APP__ = app; // para fechar watchers no teardown
  console.log(`[globalSetup] Servidor Next iniciado em ${baseUrl}`);

  // Aplica migrações antes dos testes iniciarem
  try {
    const res = await axios.post(migrateUrl, {}, { timeout: 12000 });
    console.log(
      "[globalSetup] Migrações aplicadas (novo servidor)",
      res.status,
    );
  } catch (e) {
    console.log(
      "[globalSetup] Aviso: falha ao aplicar migrações (novo servidor):",
      e?.response?.status || e.message,
    );
  }
};
