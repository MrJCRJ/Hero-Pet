/**
 * @jest-environment node
 */
// tests/api/v1/entities/summary.test.js
import orchestrator from "tests/orchestrator.js";
import database from "infra/database.js";

jest.setTimeout(35000);

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await database.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  const mig = await fetch("http://localhost:3000/api/v1/migrations", {
    method: "POST",
  });
  if (![200, 201].includes(mig.status))
    throw new Error("Falha migração summary");

  const registros = [
    {
      name: "P1",
      entity_type: "PF",
      document_digits: "",
      document_pending: true,
    },
    {
      name: "P2",
      entity_type: "PF",
      document_digits: "39053344705",
      document_pending: false,
    },
    {
      name: "P3",
      entity_type: "PF",
      document_digits: "12345",
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

describe("GET /api/v1/entities/summary", () => {
  test("Deve retornar agregados incluindo completeness (address/contact)", async () => {
    const res = await fetch("http://localhost:3000/api/v1/entities/summary");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("total", 3);
    expect(body).toHaveProperty("by_status");
    expect(body).toHaveProperty("by_pending");
    expect(body).toHaveProperty("by_address_fill");
    expect(body).toHaveProperty("by_contact_fill");
    expect(Object.values(body.by_status).reduce((a, b) => a + b, 0)).toBe(3);
    // Como não criamos dados de endereço/contato, tudo deve cair em 'vazio'
    // (somatório deve bater com total)
    const addrSum = Object.values(body.by_address_fill).reduce((a, b) => a + b, 0);
    const contactSum = Object.values(body.by_contact_fill).reduce((a, b) => a + b, 0);
    expect(addrSum).toBe(3);
    expect(contactSum).toBe(3);
  });
});
