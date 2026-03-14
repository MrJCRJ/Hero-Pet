const dotenv = require("dotenv");
const path = require("path");

// Carrega .env.test para testes (banco separado). Se não existir, usa .env.development.
const envTest = path.resolve(process.cwd(), ".env.test");
const envDev = path.resolve(process.cwd(), ".env.development");
if (require("fs").existsSync(envTest)) {
  dotenv.config({ path: envTest });
} else {
  dotenv.config({ path: envDev });
}

const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: ".",
});
const jestConfig = createJestConfig({
  moduleDirectories: ["node_modules", "<rootDir>"],
  moduleFileExtensions: ["tsx", "ts", "js", "jsx", "json"],
  testTimeout: 60000,
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/tests/setupTests.js"],
  globalSetup: "<rootDir>/tests/globalSetup.js",
  globalTeardown: "<rootDir>/tests/globalTeardown.js",
  // Encerrar processo mesmo que restem handles (ideal: eliminar causas; fallback aqui)
  forceExit: true,
  detectOpenHandles: true,
});

module.exports = jestConfig;
