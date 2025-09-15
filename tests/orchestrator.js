import retry from "async-retry";
import axios from "axios";

/**
 * Aguarda o servidor web responder 200 em /api/v1/status.
 * - Usa retries com backoff controlado.
 * - Total máximo padrão ~30s (configurável via ORCHESTRATOR_MAX_WAIT_MS).
 */
async function waitForAllServices() {
  await waitForWebServer();

  async function waitForWebServer() {
  const maxWaitMs = Number(process.env.ORCHESTRATOR_MAX_WAIT_MS || 90000);
    const startedAt = Date.now();
    let attemptCounter = 0;

    return retry(fetchStatusPage, {
      retries: 40, // suficiente para backoff curto sem estourar o maxWait
      minTimeout: 250,
      maxTimeout: 1000,
      onRetry: (err) => {
        if (process.env.DEBUG_ORCHESTRATOR) {
          console.log(
            `[orchestrator] retry (attempt=${attemptCounter}) reason=${err?.message}`,
          );
        }
        if (Date.now() - startedAt > maxWaitMs) {
          throw new Error(
            `Tempo máximo (${maxWaitMs}ms) aguardando servidor excedido`,
          );
        }
      },
    });

    async function fetchStatusPage() {
      attemptCounter++;
      const response = await axios.get(
        "http://localhost:3000/api/v1/status",
        { timeout: 4000 },
      );
      if (process.env.DEBUG_ORCHESTRATOR) {
        console.log(
          `[orchestrator] attempt=${attemptCounter} status=${response.status}`,
        );
      }
      if (response.status !== 200) throw new Error(`status=${response.status}`);
    }
  }
}

const orchestrator = { waitForAllServices };
export default orchestrator;
