/**
 * @jest-environment node
 */
import orchestrator from "tests/orchestrator.js";
import database from "infra/database.js";

jest.setTimeout(60000);

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await database.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  const mig = await fetch("http://localhost:3000/api/v1/migrations", { method: "POST" });
  if (![200, 201].includes(mig.status)) throw new Error(`migrations fail: ${mig.status}`);

  // Cria um fornecedor PJ para associar aos produtos
  const fornResp = await fetch("http://localhost:3000/api/v1/entities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "FORNECEDOR TESTE LTDA",
      entity_type: "PJ",
      document_digits: "11222333000181",
      document_pending: false,
      ativo: true,
    }),
  });
  if (fornResp.status !== 201) {
    const t = await fornResp.text();
    throw new Error(`seed fornecedor fail: ${fornResp.status} ${t}`);
  }
  const fornecedor = await fornResp.json();

  // Seed de 12 produtos intercalando categorias
  const items = Array.from({ length: 12 }).map((_, i) => ({
    nome: `Produto ${i + 1}`,
    categoria: (i % 2 === 0) ? "CAT1" : "CAT2",
  }));
  for (const p of items) {
    const r = await fetch("http://localhost:3000/api/v1/produtos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...p, fornecedor_id: fornecedor.id }),
    });
    if (![200, 201].includes(r.status)) {
      const t = await r.text();
      throw new Error(`seed produto fail: ${r.status} ${t}`);
    }
  }
});

describe("GET /api/v1/produtos paginação e meta", () => {
  test("limit e offset com meta.total", async () => {
    const p1 = await fetch("http://localhost:3000/api/v1/produtos?limit=5&offset=0&meta=1");
    expect(p1.status).toBe(200);
    const b1 = await p1.json();
    expect(b1).toHaveProperty("data");
    expect(b1).toHaveProperty("meta.total");
    expect(Array.isArray(b1.data)).toBe(true);
    expect(b1.data.length).toBe(5);
    expect(b1.meta.total).toBeGreaterThanOrEqual(12);

    const p2 = await fetch("http://localhost:3000/api/v1/produtos?limit=5&offset=5&meta=1");
    expect(p2.status).toBe(200);
    const b2 = await p2.json();
    expect(Array.isArray(b2.data)).toBe(true);
    expect(b2.data.length).toBe(5);
    // conjuntos distintos na primeira posição (ordem desc por created_at)
    expect(b2.data[0].id).not.toBe(b1.data[0].id);
  });

  test("meta com filtro não quebra (categoria)", async () => {
    const resp = await fetch("http://localhost:3000/api/v1/produtos?categoria=CAT2&meta=1&limit=3");
    expect(resp.status).toBe(200);
    const json = await resp.json();
    expect(json).toHaveProperty("meta.total");
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.every((p) => p.categoria === "CAT2")).toBe(true);
  });
});
