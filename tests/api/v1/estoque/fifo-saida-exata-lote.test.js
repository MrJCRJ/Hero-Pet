/** @jest-environment node */
// SAIDA exatamente igual à quantidade de um único lote: deve zerar disponibilidade sem criar segundo consumo.
import orchestrator from "tests/orchestrator.js";
import database from "infra/database.js";

jest.setTimeout(60000);

let produto;
let fornecedor;
let loteId;

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
    body: JSON.stringify({ name: "FORN EXATO", entity_type: "PJ" }),
  });
  fornecedor = await f.json();
  const p = await fetch("http://localhost:3000/api/v1/produtos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nome: "Produto Exato",
      categoria: "TESTE",
      fornecedor_id: fornecedor.id,
    }),
  });
  produto = await p.json();
  // Entrada de 3 unidades custo 15 cada
  const ent = await fetch("http://localhost:3000/api/v1/estoque/movimentos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      produto_id: produto.id,
      tipo: "ENTRADA",
      quantidade: 3,
      valor_unitario: 15,
      frete: 0,
      outras_despesas: 0,
      documento: "NF-EX-1",
      fifo_enabled: true,
    }),
  });
  if (![200, 201].includes(ent.status)) throw new Error("falha entrada");
  const lotes = await database.query({
    text: "SELECT id FROM estoque_lote WHERE produto_id=$1",
    values: [produto.id],
  });
  loteId = lotes.rows[0].id;
});

describe("FIFO - SAIDA exata de um lote", () => {
  test("SAIDA 3 deve zerar quantidade_disponivel do lote", async () => {
    const saida = await fetch(
      "http://localhost:3000/api/v1/estoque/movimentos",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produto_id: produto.id,
          tipo: "SAIDA",
          quantidade: 3,
          documento: "SAI-EX-1",
          fifo_enabled: true,
        }),
      },
    );
    expect([200, 201]).toContain(saida.status);
    const mov = await saida.json();
    expect(Number(mov.custo_total_rec)).toBeCloseTo(45, 4);
    expect(Number(mov.custo_unitario_rec)).toBeCloseTo(15, 4);

    const lote = await database.query({
      text: "SELECT quantidade_disponivel FROM estoque_lote WHERE id=$1",
      values: [loteId],
    });
    expect(Number(lote.rows[0].quantidade_disponivel)).toBeCloseTo(0, 3);

    const cons = await database.query({
      text: "SELECT quantidade_consumida FROM movimento_consumo_lote WHERE movimento_id=$1",
      values: [mov.id],
    });
    expect(cons.rows.length).toBe(1);
    expect(Number(cons.rows[0].quantidade_consumida)).toBeCloseTo(3, 3);
  });
});
