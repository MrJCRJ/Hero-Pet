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
  const mig = await fetch("http://localhost:3000/api/v1/migrations", {
    method: "POST",
  });
  if (![200, 201].includes(mig.status)) {
    throw new Error(
      `Falha ao aplicar migrações (get.entities). Status: ${mig.status}`,
    );
  }
});

describe("GET /api/v1/entities", () => {
  test("Deve retornar 200 e array vazio inicialmente", async () => {
    const response = await fetch("http://localhost:3000/api/v1/entities");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(0);
  });

  test("Após criar registros deve retornar lista com itens", async () => {
    // cria duas entidades
    const payloads = [
      { name: "ALFA", doc: "39053344705" },
      { name: "BETA", doc: "11144477735" }, // outro CPF válido
    ];
    for (const p of payloads) {
      const res = await fetch("http://localhost:3000/api/v1/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: p.name,
          entity_type: "PF",
          document_digits: p.doc,
          document_pending: false,
        }),
      });
      if (res.status !== 201) {
        const txt = await res.text();
        throw new Error(
          `Falha ao criar ${p.name} status ${res.status} body ${txt}`,
        );
      }
    }
    const response = await fetch("http://localhost:3000/api/v1/entities");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.length).toBeGreaterThanOrEqual(2);
    // Ordem DESC created_at => último criado primeiro (BETA antes de ALFA)
    const names = body.map((r) => r.name);
    expect(names[0]).toBe("BETA");
  });

  test("Deve retornar objeto com data e total quando meta=1", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/entities?meta=1",
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("total");
    expect(Array.isArray(body.data)).toBe(true);
    expect(typeof body.total).toBe("number");
    expect(body.total).toBeGreaterThanOrEqual(body.data.length);
  });
});
