/** @jest-environment node */
// Teste RED multi-lotes: duas entradas com custos distintos e uma saída que consome parcialmente o segundo lote.
// Entradas: 5 un a 10,00 (frete 0) => custo_unit 10.0000
//           8 un a 12,00 (frete 4) => valor_total = 8*12 + 4 = 100 -> custo_unit 12.5
// Saída: 9 un => consome 5 do lote1 (custo 10) + 4 do lote2 (custo 12.5)
// Custo total reconhecido esperado: 5*10 + 4*12.5 = 50 + 50 = 100
// custo_unitario_rec esperado: 100 / 9 = 11.1111...
// Após implementação SAIDA multi-lote (já suportada pelo loop), valores devem bater.

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
    body: JSON.stringify({ name: "FORN ML", entity_type: "PJ" }),
  });
  fornecedor = await f.json();
  const p = await fetch("http://localhost:3000/api/v1/produtos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nome: "Produto Multi",
      categoria: "TESTE",
      fornecedor_id: fornecedor.id,
    }),
  });
  produto = await p.json();

  // Entrada lote1
  await fetch("http://localhost:3000/api/v1/estoque/movimentos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      produto_id: produto.id,
      tipo: "ENTRADA",
      quantidade: 5,
      valor_unitario: 10,
      frete: 0,
      outras_despesas: 0,
      documento: "NF-ML-1",
      fifo_enabled: true,
    }),
  });
  // Entrada lote2
  await fetch("http://localhost:3000/api/v1/estoque/movimentos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      produto_id: produto.id,
      tipo: "ENTRADA",
      quantidade: 8,
      valor_unitario: 12,
      frete: 4,
      outras_despesas: 0,
      documento: "NF-ML-2",
      fifo_enabled: true,
    }),
  });
});

describe("FIFO - SAIDA multi-lotes", () => {
  test("SAIDA 9 unidades deve consumir 2 lotes e reconhecer custo ponderado correto", async () => {
    const resp = await fetch(
      "http://localhost:3000/api/v1/estoque/movimentos",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produto_id: produto.id,
          tipo: "SAIDA",
          quantidade: 9,
          documento: "SAI-ML-1",
          fifo_enabled: true,
        }),
      },
    );
    expect([200, 201]).toContain(resp.status);
    const movimento = await resp.json();

    // Verifica consumos
    const cons = await database.query({
      text: `SELECT lote_id, quantidade_consumida, custo_unitario_aplicado, custo_total FROM movimento_consumo_lote WHERE movimento_id=$1 ORDER BY id ASC`,
      values: [movimento.id],
    });
    expect(cons.rows.length).toBe(2);
    const c1 = cons.rows[0];
    const c2 = cons.rows[1];
    // Primeiro lote: 5 unidades a 10
    expect(Number(c1.quantidade_consumida)).toBeCloseTo(5, 3);
    expect(Number(c1.custo_unitario_aplicado)).toBeCloseTo(10, 4);
    expect(Number(c1.custo_total)).toBeCloseTo(50, 4);
    // Segundo lote: 4 unidades a 12.5
    expect(Number(c2.quantidade_consumida)).toBeCloseTo(4, 3);
    expect(Number(c2.custo_unitario_aplicado)).toBeCloseTo(12.5, 4);
    expect(Number(c2.custo_total)).toBeCloseTo(50, 4);

    // Movimento custo reconhecido
    expect(Number(movimento.custo_total_rec)).toBeCloseTo(100, 4);
    expect(Number(movimento.custo_unitario_rec)).toBeCloseTo(11.1111, 3); // tolerância 3 casas

    // Quantidades disponíveis: lote1 -> 0, lote2 -> 4
    const lotes = await database.query({
      text: `SELECT id, quantidade_disponivel FROM estoque_lote WHERE produto_id=$1 ORDER BY id ASC`,
      values: [produto.id],
    });
    expect(lotes.rows.length).toBe(2);
    expect(Number(lotes.rows[0].quantidade_disponivel)).toBeCloseTo(0, 3);
    expect(Number(lotes.rows[1].quantidade_disponivel)).toBeCloseTo(4, 3);
  });
});
