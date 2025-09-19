/**
 * @jest-environment node
 */
// tests/api/v1/produtos/get.test.js
import orchestrator from "tests/orchestrator.js";
import database from "infra/database.js";

jest.setTimeout(45000);

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await database.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  const mig = await fetch("http://localhost:3000/api/v1/migrations", {
    method: "POST",
  });
  if (![200, 201].includes(mig.status)) {
    throw new Error(
      `Falha ao aplicar migrações para testes de produtos (GET). Status: ${mig.status}`,
    );
  }

  // Cria fornecedor PJ para associar aos produtos
  const fornResp = await fetch("http://localhost:3000/api/v1/entities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "FORNECEDOR GET LTDA",
      entity_type: "PJ",
      document_digits: "55443322000100",
      document_pending: false,
      ativo: true,
    }),
  });
  if (fornResp.status !== 201) {
    const t = await fornResp.text();
    throw new Error(`seed fornecedor fail: ${fornResp.status} ${t}`);
  }
  const fornecedor = await fornResp.json();

  // Seeds mínimos
  const base = [
    { nome: "Ração Filhote 2kg", categoria: "RACOES", codigo_barras: "789100000001" },
    { nome: "Ração Adulto 10kg", categoria: "RACOES" },
    { nome: "Areia Fina 4kg", categoria: "HIGIENE", ativo: false },
    { nome: "Shampoo Neutro 500ml", categoria: "HIGIENE", codigo_barras: "789200000001" },
  ];
  for (const p of base) {
    const resp = await fetch("http://localhost:3000/api/v1/produtos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...p, fornecedor_id: fornecedor.id }),
    });
    if (![200, 201].includes(resp.status)) {
      const err = await resp.text();
      throw new Error(`Seed produto falhou: status=${resp.status} body=${err}`);
    }
  }
});

describe("GET /api/v1/produtos", () => {
  test("Lista sem filtros (limite padrão)", async () => {
    const resp = await fetch("http://localhost:3000/api/v1/produtos");
    expect(resp.status).toBe(200);
    const list = await resp.json();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(4);
  });

  test("Filtra por nome (q) e categoria", async () => {
    const resp = await fetch(
      "http://localhost:3000/api/v1/produtos?q=Ração&categoria=RACOES",
    );
    expect(resp.status).toBe(200);
    const list = await resp.json();
    expect(list.every((p) => p.categoria === "RACOES")).toBe(true);
    expect(list.some((p) => p.nome.includes("Ração"))).toBe(true);
  });

  test("Filtra por codigo_barras", async () => {
    const resp = await fetch(
      "http://localhost:3000/api/v1/produtos?codigo_barras=789200000001",
    );
    expect(resp.status).toBe(200);
    const list = await resp.json();
    expect(list.length).toBe(1);
    expect(list[0]).toHaveProperty("nome", "Shampoo Neutro 500ml");
  });

  test("Filtra por ativo=false", async () => {
    const resp = await fetch(
      "http://localhost:3000/api/v1/produtos?ativo=false",
    );
    expect(resp.status).toBe(200);
    const list = await resp.json();
    expect(list.every((p) => p.ativo === false)).toBe(true);
  });
});
