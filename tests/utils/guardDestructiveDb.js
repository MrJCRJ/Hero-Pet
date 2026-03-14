/**
 * Proteção contra execução de testes destrutivos (DROP SCHEMA) em banco de produção/desenvolvimento.
 *
 * Vários testes de integração fazem DROP SCHEMA public CASCADE, que APAGA TODOS OS DADOS.
 * Isso deve rodar APENAS em um banco de testes dedicado.
 *
 * Uso: chame assertSafeForDestructiveTests() no início do beforeAll de testes que fazem DROP SCHEMA.
 */

function assertSafeForDestructiveTests() {
  const host = process.env.POSTGRES_HOST || "";
  const db = process.env.POSTGRES_DB || "hero_pet";

  const isCloud =
    host.includes("neon.tech") ||
    host.includes("aws") ||
    host.includes("supabase") ||
    (host && !host.includes("localhost") && !host.includes("127.0.0.1"));

  const isTestDb = db.endsWith("_test") || db === "hero_pet_test";

  if (isCloud && !isTestDb) {
    throw new Error(
      [
        "BLOQUEADO: Testes destrutivos (DROP SCHEMA) não podem rodar em banco de produção/cloud.",
        "",
        `Você está conectado a: ${host} / ${db}`,
        "",
        "Para rodar estes testes:",
        "1. Crie um banco de testes separado (ex: hero_pet_test)",
        "2. Crie .env.test com POSTGRES_DB=hero_pet_test e outras variáveis",
        "3. Execute: npm run test -- --env-file=.env.test",
        "   ou configure Jest para carregar .env.test",
        "",
        "NUNCA use o banco de dados principal para testes que resetam o schema.",
      ].join("\n")
    );
  }
}

module.exports = { assertSafeForDestructiveTests };
