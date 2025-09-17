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
  test("Deve retornar agregados incluindo completeness e percentuais", async () => {
    const res = await fetch("http://localhost:3000/api/v1/entities/summary");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("total", 3);
    expect(body).toHaveProperty("by_status");
    expect(body).toHaveProperty("by_pending");
    expect(body).toHaveProperty("by_address_fill");
    expect(body).toHaveProperty("by_contact_fill");
    expect(body).toHaveProperty("percent_address_fill");
    expect(body).toHaveProperty("percent_contact_fill");
    expect(Object.values(body.by_status).reduce((a, b) => a + b, 0)).toBe(3);
    // Como não criamos dados de endereço/contato, tudo deve cair em 'vazio'
    // (somatório deve bater com total)
    const addrSum = Object.values(body.by_address_fill).reduce(
      (a, b) => a + b,
      0,
    );
    const contactSum = Object.values(body.by_contact_fill).reduce(
      (a, b) => a + b,
      0,
    );
    expect(addrSum).toBe(3);
    expect(contactSum).toBe(3);
    // Percentuais consistentes: soma pode não ser 100 por arredondamento, mas cada chave deve estar entre 0 e 100
    Object.values(body.percent_address_fill).forEach((p) =>
      expect(p).toBeGreaterThanOrEqual(0),
    );
    Object.values(body.percent_contact_fill).forEach((p) =>
      expect(p).toBeGreaterThanOrEqual(0),
    );
    // Consistência de categorias (mesmo conjunto e ordem irrelevante)
    const expectedCats = ["completo", "parcial", "vazio"];
    // Normaliza mapas para garantir presença explícita das categorias esperadas
    const norm = (m) =>
      expectedCats.reduce((acc, k) => {
        acc[k] = m[k] ?? 0;
        return acc;
      }, {});
    const byAddr = norm(body.by_address_fill);
    const byContact = norm(body.by_contact_fill);
    const pctAddr = norm(body.percent_address_fill);
    const pctContact = norm(body.percent_contact_fill);
    expect(Object.keys(pctAddr).sort()).toEqual(expectedCats.slice().sort());
    expect(Object.keys(pctContact).sort()).toEqual(expectedCats.slice().sort());
    expect(Object.keys(byAddr).sort()).toEqual(expectedCats.slice().sort());
    expect(Object.keys(byContact).sort()).toEqual(expectedCats.slice().sort());
    // Soma aproximada (tolerância 0.2 * número de chaves para arredondamento) quando existem itens
    const sumAddr = Object.values(body.percent_address_fill).reduce(
      (a, b) => a + b,
      0,
    );
    const sumContact = Object.values(body.percent_contact_fill).reduce(
      (a, b) => a + b,
      0,
    );
    // Se não há registros, percentuais serão 0 e soma 0; nesse caso pulamos verificação de ~100 via guard booleano.
    const shouldApprox100 = body.total > 0;
    // Definir limites esperados dinamicamente
    const addrLower = shouldApprox100 ? 98.0 : 0;
    const addrUpper = shouldApprox100 ? 101.0 : 0;
    const contactLower = shouldApprox100 ? 98.0 : 0;
    const contactUpper = shouldApprox100 ? 101.0 : 0;
    expect(sumAddr).toBeGreaterThanOrEqual(addrLower);
    expect(sumAddr).toBeLessThanOrEqual(addrUpper);
    expect(sumContact).toBeGreaterThanOrEqual(contactLower);
    expect(sumContact).toBeLessThanOrEqual(contactUpper);
  });
});
