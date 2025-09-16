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
  const mig = await fetch("http://localhost:3000/api/v1/migrations", {
    method: "POST",
  });
  if (![200, 201].includes(mig.status)) {
    throw new Error(
      `Falha ao aplicar migrações (filters.entities). Status: ${mig.status}`,
    );
  }
});

describe("GET /api/v1/entities filtros", () => {
  beforeAll(async () => {
    // cria diferentes combinações
    const registros = [
      {
        name: "PENDENTE",
        entity_type: "PF",
        document_digits: "",
        document_pending: true,
      },
      {
        name: "PROVISORIO",
        entity_type: "PF",
        document_digits: "12345",
        document_pending: false,
      },
      {
        name: "VALIDO",
        entity_type: "PF",
        document_digits: "39053344705",
        document_pending: false,
      },
    ];
    for (const r of registros) {
      await fetch("http://localhost:3000/api/v1/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(r),
      });
    }
  });

  test("Filtro status=pending retorna apenas pending", async () => {
    const res = await fetch(
      "http://localhost:3000/api/v1/entities?status=pending",
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.length).toBeGreaterThanOrEqual(1);
    body.forEach((row) => expect(row.document_status).toBe("pending"));
  });

  test("Filtro status=provisional retorna apenas provisional", async () => {
    const res = await fetch(
      "http://localhost:3000/api/v1/entities?status=provisional",
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.length).toBeGreaterThanOrEqual(1);
    body.forEach((row) => expect(row.document_status).toBe("provisional"));
  });

  test("Filtro status=valid retorna apenas valid", async () => {
    const res = await fetch(
      "http://localhost:3000/api/v1/entities?status=valid",
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.length).toBeGreaterThanOrEqual(1);
    body.forEach((row) => expect(row.document_status).toBe("valid"));
  });

  test("Filtro pending=true retorna apenas document_pending true", async () => {
    const res = await fetch(
      "http://localhost:3000/api/v1/entities?pending=true",
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.length).toBeGreaterThanOrEqual(1);
    body.forEach((row) => expect(row.document_pending).toBe(true));
  });
});
