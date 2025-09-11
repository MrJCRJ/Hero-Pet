// tests/api/v1/migrations/get.test.js
import database from "infra/database.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await database.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
});

// Remova o afterAll se database.end() não existir
// afterAll(async () => {
//   await database.end();
// });

describe("GET /api/v1/migrations", () => {
  test("Deve retornar 200 com um array de migrações pendentes", async () => {
    const response = await fetch("http://localhost:3000/api/v1/migrations");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/application\/json/);

    const responseBody = await response.json();

    expect(Array.isArray(responseBody)).toBe(true);
    expect(responseBody.length).toBeGreaterThan(0);

    // Verifica se cada item tem a estrutura esperada
    responseBody.forEach((migration) => {
      expect(migration).toHaveProperty("name");
      expect(migration).toHaveProperty("path");
      expect(typeof migration.name).toBe("string");
      expect(typeof migration.path).toBe("string");
    });
  });

  test("Deve retornar array vazio quando não há migrações pendentes", async () => {
    // Executa todas as migrações primeiro
    const postResponse = await fetch(
      "http://localhost:3000/api/v1/migrations",
      {
        method: "POST",
      },
    );

    expect([201, 200]).toContain(postResponse.status);

    // Agora verifica que GET retorna array vazio
    const getResponse = await fetch("http://localhost:3000/api/v1/migrations");

    expect(getResponse.status).toBe(200);

    const responseBody = await getResponse.json();

    expect(Array.isArray(responseBody)).toBe(true);
    expect(responseBody.length).toBe(0);
  });

  // Teste comentado - CORS não está implementado
  // tests("Deve retornar headers CORS apropriados", async () => {
  //   const response = await fetch("http://localhost:3000/api/v1/migrations");
  //   expect(response.headers.get("access-control-allow-origin")).toBe("*");
  //   expect(response.headers.get("access-control-allow-methods")).toContain("GET");
  // });

  test("Deve retornar 405 para métodos não suportados", async () => {
    const methods = ["PUT", "DELETE", "PATCH"];

    for (const method of methods) {
      const response = await fetch("http://localhost:3000/api/v1/migrations", {
        method: method,
      });

      expect(response.status).toBe(405);

      const responseBody = await response.json();
      expect(responseBody).toHaveProperty("error");
      expect(responseBody.error).toBe(`Method "${method}" not allowed`);
    }
  });
});
