const axios = require("axios");
const next = require("next");
const http = require("http");

module.exports = async () => {
  const statusUrl = "http://localhost:3000/api/v1/status";
  try {
    await axios.get(statusUrl, { timeout: 1200 });
    console.log(
      "[globalSetup] Reutilizando servidor Next existente na porta 3000",
    );
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
  console.log("[globalSetup] Servidor Next iniciado em http://localhost:3000");
};
