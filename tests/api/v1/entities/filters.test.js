/**
 * @jest-environment node
 */
// tests/api/v1/entities/filters.test.js
import orchestrator from "tests/orchestrator.js";
import database from "infra/database.js";

jest.setTimeout(35000);

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await database.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  const mig = await fetch("http://localhost:3000/api/v1/migrations", { method: "POST" });
  if (![200, 201].includes(mig.status)) {
    throw new Error(`Falha ao aplicar migrações (filters.entities). Status: ${mig.status}`);
  }
});

describe("GET /api/v1/entities filtros (fase vermelha)", () => {
  test("Filtro status=pending deve eventualmente retornar apenas registros pending", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/entities?status=pending",
    );
    expect(response.status).toBe(404); // Atualizaremos após implementação
  });

  test("Filtro pending=true deve eventualmente retornar apenas document_pending=true", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/entities?pending=true",
    );
    expect(response.status).toBe(404);
  });
});
