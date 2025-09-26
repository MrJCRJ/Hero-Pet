const axios = require("axios");
const next = require("next");
const http = require("http");
const net = require("net");

module.exports = async () => {
  const statusUrl = "http://localhost:3000/api/v1/status";
  const migrateUrl = "http://localhost:3000/api/v1/migrations";

  // 1) Probe: se a porta 3000 estiver ocupada, tentamos reutilizar
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
      .listen(3000);
  });

  if (portInUse) {
    try {
      await axios.get(statusUrl, { timeout: 1500 });
      console.log(
        "[globalSetup] Porta 3000 em uso — reutilizando servidor Next existente",
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
        "[globalSetup] Porta 3000 ocupada mas /status indisponível — seguindo para iniciar Next",
      );
    }
  } else {
    // Checagem http direta pode ser mais rápida quando servidor já está pronto
    try {
      await axios.get(statusUrl, { timeout: 1200 });
      console.log(
        "[globalSetup] Reutilizando servidor Next existente na porta 3000",
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
          "[globalSetup] Detected EADDRINUSE during listen — assumindo servidor externo e reutilizando",
        );
        resolve();
      } else {
        reject(err);
      }
    });
    server.listen(3000, resolve);
  });

  global.__NEXT_TEST_SERVER__ = server;
  global.__NEXT_TEST_APP__ = app; // para fechar watchers no teardown
  console.log("[globalSetup] Servidor Next iniciado em http://localhost:3000");

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
