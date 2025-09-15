/**
 * @jest-environment node
 */
// tests/api/v1/entities/get.test.js
import orchestrator from "tests/orchestrator.js";
import database from "infra/database.js";

jest.setTimeout(35000);

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await database.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  const mig = await fetch("http://localhost:3000/api/v1/migrations", { method: "POST" });
  if (![200, 201].includes(mig.status)) {
    throw new Error(`Falha ao aplicar migrações (get.entities). Status: ${mig.status}`);
  }
});

describe("GET /api/v1/entities (TDD inicial)", () => {
  test("Fase vermelha: atualmente deve retornar 404 antes de implementação", async () => {
    const response = await fetch("http://localhost:3000/api/v1/entities");
    // Enquanto endpoint não existe esperamos 404. Assim que criarmos, atualizaremos para 200 + corpo.
    expect(response.status).toBe(404);
  });
});
