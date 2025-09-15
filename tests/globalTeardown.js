module.exports = async () => {
  if (global.__NEXT_TEST_SERVER__) {
    await new Promise((resolve) => global.__NEXT_TEST_SERVER__.close(resolve));
    console.log("[globalTeardown] Servidor Next finalizado");
  }
};
