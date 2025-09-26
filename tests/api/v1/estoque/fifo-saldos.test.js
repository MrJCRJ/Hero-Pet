/** @jest-environment node */
// Teste RED inicial para endpoint /api/v1/estoque/saldos_fifo (ainda inexistente)
// Cenários:
// 1. Sem lotes -> retorna quantidade_total=0, valor_total=0, custo_medio=null
// 2. Dois lotes com custos distintos -> agrega corretamente
// 3. include_lotes=1 retorna array de lotes ordenados FIFO
// 4. Produto inexistente -> 404
// 5. Validação produto_id obrigatório -> 400
import orchestrator from "tests/orchestrator.js";
import database from "infra/database.js";

jest.setTimeout(60000);

let produtoA;
let fornecedor;

async function criaProduto(nome) {
  const p = await fetch("http://localhost:3000/api/v1/produtos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome, categoria: "TESTE" }),
  });
  if (![200, 201].includes(p.status)) throw new Error("Falha criar produto");
  return p.json();
}

beforeAll(async () => {
  process.env.FIFO_ENABLED = "1";
  await orchestrator.waitForAllServices();
  await database.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  const mig = await fetch("http://localhost:3000/api/v1/migrations", {
    method: "POST",
  });
  if (![200, 201].includes(mig.status)) throw new Error("migracoes");
  const f = await fetch("http://localhost:3000/api/v1/entities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "FORN SALDOS", entity_type: "PJ" }),
  });
  fornecedor = await f.json();
  const pa = await fetch("http://localhost:3000/api/v1/produtos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nome: "Produto A",
      categoria: "TESTE",
      fornecedor_id: fornecedor.id,
    }),
  });
  produtoA = await pa.json();
});

describe("FIFO - saldos agregados", () => {
  test("(1) Sem lotes retorna zeros e custo_medio null", async () => {
    const r = await fetch(
      `http://localhost:3000/api/v1/estoque/saldos_fifo?produto_id=${produtoA.id}`,
    );
    expect(r.status).toBe(200); // RED: endpoint não existe ainda (404 esperado inicialmente)
    const body = await r.json();
    expect(Number(body.quantidade_total)).toBeCloseTo(0, 3);
    expect(Number(body.valor_total)).toBeCloseTo(0, 2);
    expect(body.custo_medio).toBeNull();
  });

  test("(2) Dois lotes agrega corretamente", async () => {
    // Cria ENTRADA lote1 5 un a 10
    await fetch("http://localhost:3000/api/v1/estoque/movimentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        produto_id: produtoA.id,
        tipo: "ENTRADA",
        quantidade: 5,
        valor_unitario: 10,
        frete: 0,
        outras_despesas: 0,
        documento: "NF-SA-1",
        fifo_enabled: true,
      }),
    });
    // Cria ENTRADA lote2 3 un a 12, frete 2 => valor_total = 3*12 + 2 = 38 => custo_unit 12.666666..., mas armazenado com 4 casas
    await fetch("http://localhost:3000/api/v1/estoque/movimentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        produto_id: produtoA.id,
        tipo: "ENTRADA",
        quantidade: 3,
        valor_unitario: 12,
        frete: 2,
        outras_despesas: 0,
        documento: "NF-SA-2",
        fifo_enabled: true,
      }),
    });

    const r = await fetch(
      `http://localhost:3000/api/v1/estoque/saldos_fifo?produto_id=${produtoA.id}`,
    );
    expect(r.status).toBe(200);
    const b = await r.json();
    // quantidade_total = 8
    expect(Number(b.quantidade_total)).toBeCloseTo(8, 3);
    // valor_total = (5*10) + 38 = 50 + 38 = 88
    expect(Number(b.valor_total)).toBeCloseTo(88, 2);
    // custo_medio = 88 / 8 = 11
    expect(Number(b.custo_medio)).toBeCloseTo(11, 4);
  });

  test("(3) include_lotes retorna lista ordenada", async () => {
    const r = await fetch(
      `http://localhost:3000/api/v1/estoque/saldos_fifo?produto_id=${produtoA.id}&include_lotes=1`,
    );
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(Array.isArray(b.lotes)).toBe(true);
    expect(b.lotes.length).toBe(2);
    // Ordem FIFO preservada (lote1 primeiro)
    expect(Number(b.lotes[0].quantidade_disponivel)).toBeCloseTo(5, 3);
    expect(Number(b.lotes[1].quantidade_disponivel)).toBeCloseTo(3, 3);
  });

  test("(4) Produto inexistente -> 404", async () => {
    const r = await fetch(
      "http://localhost:3000/api/v1/estoque/saldos_fifo?produto_id=999999",
    );
    expect(r.status).toBe(404);
  });

  test("(5) Sem produto_id -> 400", async () => {
    const r = await fetch("http://localhost:3000/api/v1/estoque/saldos_fifo");
    expect(r.status).toBe(400);
  });
});
