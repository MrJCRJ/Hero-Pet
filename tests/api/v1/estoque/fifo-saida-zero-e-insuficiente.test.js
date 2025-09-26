/** @jest-environment node */
// Cenário: consumir todo estoque (duas saídas separadas) e depois tentar nova saída que deve falhar.
import orchestrator from "tests/orchestrator.js";
import database from "infra/database.js";

jest.setTimeout(60000);

let produto;
let fornecedor;

beforeAll(async () => {
  process.env.FIFO_ENABLED = "1";
  await orchestrator.waitForAllServices();
  await database.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  const mig = await fetch("http://localhost:3000/api/v1/migrations", {
    method: "POST",
  });
  if (![200, 201].includes(mig.status)) throw new Error("migracoes falharam");
  const f = await fetch("http://localhost:3000/api/v1/entities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "FORN ZERO", entity_type: "PJ" }),
  });
  fornecedor = await f.json();
  const p = await fetch("http://localhost:3000/api/v1/produtos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nome: "Produto Zero",
      categoria: "TESTE",
      fornecedor_id: fornecedor.id,
    }),
  });
  produto = await p.json();
  // Entrada total 4
  await fetch("http://localhost:3000/api/v1/estoque/movimentos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      produto_id: produto.id,
      tipo: "ENTRADA",
      quantidade: 4,
      valor_unitario: 9,
      frete: 0,
      outras_despesas: 0,
      documento: "NF-ZR-1",
      fifo_enabled: true,
    }),
  });
});

describe("FIFO - Zera estoque e falha após", () => {
  test("Duas saídas que zeram + terceira falha", async () => {
    // Primeira saída 1
    const s1 = await fetch("http://localhost:3000/api/v1/estoque/movimentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        produto_id: produto.id,
        tipo: "SAIDA",
        quantidade: 1,
        documento: "SAI-ZR-1",
        fifo_enabled: true,
      }),
    });
    expect([200, 201]).toContain(s1.status);
    // Segunda saída 3 (zera)
    const s2 = await fetch("http://localhost:3000/api/v1/estoque/movimentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        produto_id: produto.id,
        tipo: "SAIDA",
        quantidade: 3,
        documento: "SAI-ZR-2",
        fifo_enabled: true,
      }),
    });
    expect([200, 201]).toContain(s2.status);
    // Checar lote zerado
    const lote = await database.query({
      text: "SELECT quantidade_disponivel FROM estoque_lote WHERE produto_id=$1",
      values: [produto.id],
    });
    expect(Number(lote.rows[0].quantidade_disponivel)).toBeCloseTo(0, 3);

    // Terceira saída falha
    const s3 = await fetch("http://localhost:3000/api/v1/estoque/movimentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        produto_id: produto.id,
        tipo: "SAIDA",
        quantidade: 1,
        documento: "SAI-ZR-3",
        fifo_enabled: true,
      }),
    });
    expect(s3.status).toBe(400);
    const txt = await s3.text();
    expect(txt).toMatch(/Estoque insuficiente/);
  });
});
