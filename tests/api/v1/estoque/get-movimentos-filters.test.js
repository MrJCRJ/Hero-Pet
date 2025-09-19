/**
 * @jest-environment node
 */
import orchestrator from "tests/orchestrator.js";
import database from "infra/database.js";

jest.setTimeout(60000);

let produto;
let fornecedor;

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await database.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  const mig = await fetch("http://localhost:3000/api/v1/migrations", { method: "POST" });
  if (![200, 201].includes(mig.status)) throw new Error("migrations fail");

  const f = await fetch("http://localhost:3000/api/v1/entities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "FORN MOV FILTROS", entity_type: "PJ" }),
  });
  if (![200, 201].includes(f.status)) throw new Error(`seed fornecedor fail: ${f.status}`);
  fornecedor = await f.json();

  const p = await fetch("http://localhost:3000/api/v1/produtos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome: "Prod Mov Filtros", fornecedor_id: fornecedor.id }),
  });
  if (![200, 201].includes(p.status)) throw new Error("seed produto fail");
  produto = await p.json();

  const seq = [
    { tipo: "ENTRADA", quantidade: 3, valor_unitario: 12, documento: "NF1" },
    { tipo: "SAIDA", quantidade: 1, documento: "VENDA1" },
    { tipo: "ENTRADA", quantidade: 2, valor_unitario: 15, documento: "NF2" },
    { tipo: "AJUSTE", quantidade: -1, documento: "AJD" },
  ];
  for (const m of seq) {
    const r = await fetch("http://localhost:3000/api/v1/estoque/movimentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ produto_id: produto.id, ...m }),
    });
    if (![200, 201].includes(r.status)) {
      const t = await r.text();
      throw new Error(`seed movimento fail: ${r.status} ${t}`);
    }
  }
});

describe("GET /api/v1/estoque/movimentos com filtros", () => {
  test("filtra por tipo e limita", async () => {
    const resp = await fetch(
      `http://localhost:3000/api/v1/estoque/movimentos?produto_id=${produto.id}&tipo=ENTRADA&limit=1&meta=1`,
    );
    expect(resp.status).toBe(200);
    const json = await resp.json();
    // quando meta=1 retornamos { data, meta }
    expect(json).toHaveProperty("meta.total");
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBe(1);
    expect(json.data[0]).toHaveProperty("tipo", "ENTRADA");
  });
});
