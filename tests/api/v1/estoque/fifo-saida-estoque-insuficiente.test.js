/** @jest-environment node */
// SAIDA com quantidade maior que estoque disponível deve retornar 400 em modo FIFO.
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
    body: JSON.stringify({ name: "FORN INSUF", entity_type: "PJ" }),
  });
  fornecedor = await f.json();
  const p = await fetch("http://localhost:3000/api/v1/produtos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nome: "Produto Insuf",
      categoria: "TESTE",
      fornecedor_id: fornecedor.id,
    }),
  });
  produto = await p.json();
  // Entrada 2 unidades
  await fetch("http://localhost:3000/api/v1/estoque/movimentos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      produto_id: produto.id,
      tipo: "ENTRADA",
      quantidade: 2,
      valor_unitario: 5,
      frete: 0,
      outras_despesas: 0,
      documento: "NF-IN-1",
      fifo_enabled: true,
    }),
  });
});

describe("FIFO - SAIDA estoque insuficiente", () => {
  test("SAIDA maior que estoque deve retornar 400 e não alterar lote", async () => {
    const saida = await fetch(
      "http://localhost:3000/api/v1/estoque/movimentos",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produto_id: produto.id,
          tipo: "SAIDA",
          quantidade: 3,
          documento: "SAI-IN-1",
          fifo_enabled: true,
        }),
      },
    );
    expect(saida.status).toBe(400);
    const txt = await saida.text();
    expect(txt).toMatch(/Estoque insuficiente/);
    const lotes = await database.query({
      text: "SELECT quantidade_disponivel FROM estoque_lote WHERE produto_id=$1",
      values: [produto.id],
    });
    expect(Number(lotes.rows[0].quantidade_disponivel)).toBeCloseTo(2, 3);
    const consumos = await database.query({
      text: "SELECT COUNT(*)::int AS c FROM movimento_consumo_lote",
      values: [],
    });
    expect(consumos.rows[0].c).toBe(0);
  });
});
