module.exports = async () => {
  try {
    const { shutdownOrchestrator } = require('./orchestrator.js');
    if (shutdownOrchestrator) shutdownOrchestrator();
  } catch (_) {
    // ignora se não carregar (ex: caching differente para ESM/CJS)
  }
  if (global.__NEXT_TEST_SERVER__) {
    await new Promise((resolve) => global.__NEXT_TEST_SERVER__.close(resolve));
    console.log("[globalTeardown] Servidor Next finalizado");
  }
  if (global.__NEXT_TEST_APP__ && typeof global.__NEXT_TEST_APP__.close === 'function') {
    try {
      await global.__NEXT_TEST_APP__.close();
      // next 13/14+: close pode não existir dependendo do modo, fallback silencioso
      console.log('[globalTeardown] Next app watchers encerrados');
    } catch (err) {
      console.warn('[globalTeardown] Falha ao fechar app Next:', err.message);
    }
  }
};
