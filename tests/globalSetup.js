const axios = require("axios");
const next = require("next");
const http = require("http");

module.exports = async () => {
  const statusUrl = "http://localhost:3000/api/v1/status";
  const migrateUrl = "http://localhost:3000/api/v1/migrations";
  try {
    await axios.get(statusUrl, { timeout: 1200 });
    console.log(
      "[globalSetup] Reutilizando servidor Next existente na porta 3000",
    );
    // Garante que as migrações estejam aplicadas mesmo reutilizando servidor
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
  } catch (err) {
    console.log(
      "[globalSetup] Nenhum servidor detectado; iniciando instância de teste...",
    );
  }

  const dev = true;
  const app = next({ dev });
  await app.prepare();
  const handle = app.getRequestHandler();

  const server = http.createServer((req, res) => handle(req, res));
  await new Promise((resolve) => server.listen(3000, resolve));

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
