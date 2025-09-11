// tests/api/v1/migrations/post.test.js
import database from "infra/database.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await database.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
});

describe("POST /api/v1/migrations", () => {
  test("Deve retornar 201 ao executar migrações pela primeira vez", async () => {
    const primeiraResposta = await fetch(
      "http://localhost:3000/api/v1/migrations",
      {
        method: "POST",
      },
    );

    expect(primeiraResposta.status).toBe(201);
    expect(primeiraResposta.headers.get("content-type")).toMatch(
      /application\/json/,
    );

    const corpoPrimeiraResposta = await primeiraResposta.json();

    expect(Array.isArray(corpoPrimeiraResposta)).toBe(true);
    expect(corpoPrimeiraResposta.length).toBeGreaterThan(0);
  });

  test("Deve retornar 200 quando não há migrações pendentes", async () => {
    // Tenta executar novamente - não deve ter migrações pendentes
    const resposta = await fetch("http://localhost:3000/api/v1/migrations", {
      method: "POST",
    });

    expect(resposta.status).toBe(200);

    const corpoResposta = await resposta.json();
    expect(Array.isArray(corpoResposta)).toBe(true);
    expect(corpoResposta.length).toBe(0);
  });

  test("Deve aplicar as migrações corretamente no banco de dados", async () => {
    // Verifica se a tabela de migrações existe e contém registros
    const tabelaMigracoes = await database.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'pgmigrations'
      )
    `);

    expect(tabelaMigracoes.rows[0].exists).toBe(true);

    // Verifica se há registros na tabela de migrações
    const registrosMigracoes = await database.query(`
      SELECT COUNT(*) FROM pgmigrations
    `);

    expect(Number(registrosMigracoes.rows[0].count)).toBeGreaterThan(0);

    // Lista todas as tabelas para debugging
    const todasTabelas = await database.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log("Tabelas no banco de dados:", todasTabelas.rows);

    // Verifica se temos pelo menos a tabela de migrações
    expect(todasTabelas.rows.length).toBeGreaterThan(0);
    expect(
      todasTabelas.rows.some((tabela) => tabela.table_name === "pgmigrations"),
    ).toBe(true);
  });

  test("Deve retornar 405 para métodos não permitidos", async () => {
    const metodosNaoPermitidos = ["PUT", "DELETE", "PATCH"];

    for (const metodo of metodosNaoPermitidos) {
      const resposta = await fetch("http://localhost:3000/api/v1/migrations", {
        method: metodo,
      });

      expect(resposta.status).toBe(405);

      const corpoResposta = await resposta.json();
      expect(corpoResposta).toHaveProperty("error");
      expect(corpoResposta.error).toContain(metodo);
    }
  });
});
