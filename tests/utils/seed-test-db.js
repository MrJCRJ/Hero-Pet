#!/usr/bin/env node
/**
 * Seed mínimo para banco de testes:
 * - Executa migrations
 * - Limpa schema público
 * - Não injeta dados fixos de domínio (os testes de integração já criam via API)
 *
 * Uso:
 *   node tests/utils/seed-test-db.js
 */
const { Client } = require("pg");
const path = require("node:path");
const fs = require("node:fs");
const dotenv = require("dotenv");
const { spawnSync } = require("node:child_process");

const envPath = path.resolve(process.cwd(), ".env.test");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

function getPgConfig() {
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL };
  }
  return {
    host: process.env.POSTGRES_HOST || "localhost",
    port: Number(process.env.POSTGRES_PORT || 5432),
    user: process.env.POSTGRES_USER || "postgres",
    password: process.env.POSTGRES_PASSWORD || "postgres",
    database: process.env.POSTGRES_DB || "hero_pet_test",
  };
}

function runMigrations() {
  const result = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["node-pg-migrate", "-m", "infra/migrations", "--envPath", ".env.test", "up"],
    { stdio: "inherit" }
  );
  if (result.status !== 0) {
    throw new Error("Falha ao executar migrations para o banco de teste.");
  }
}

async function resetSchema() {
  const client = new Client(getPgConfig());
  await client.connect();
  try {
    await client.query("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
  } finally {
    await client.end();
  }
}

async function main() {
  console.log("[seed-test-db] reset schema...");
  await resetSchema();
  console.log("[seed-test-db] run migrations...");
  runMigrations();
  console.log("[seed-test-db] ok");
}

main().catch((error) => {
  console.error("[seed-test-db] erro:", error.message);
  process.exit(1);
});
