/** @jest-environment node */
// tests/api/v1/estoque/fifo-consumo-saida.test.js
// Fase 1 FIFO (SAIDA): TDD RED
// Objetivo: ao registrar uma SAIDA com FIFO habilitado deve:
//  1. Consumir quantidade do(s) lote(s) FIFO (mais antigo primeiro)
//  2. Criar registro em movimento_consumo_lote com custo aplicado
//  3. Atualizar quantidade_disponivel do lote
//  4. Persistir custo reconhecido (custo_total_rec / custo_unitario_rec) no movimento SAIDA
// Este teste inicialmente deve falhar até implementarmos a lógica de consumo.

import orchestrator from "tests/orchestrator.js";
import database from "infra/database.js";

jest.setTimeout(60000);

let produto;
let fornecedor;

beforeAll(async () => {
  process.env.FIFO_ENABLED = "1"; // flag global
  await orchestrator.waitForAllServices();
  // recria schema limpo
  await database.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  const mig = await fetch("http://localhost:3000/api/v1/migrations", {
    method: "POST",
  });
  if (![200, 201].includes(mig.status)) throw new Error("Falha migrações");

  // fornecedor
  const f = await fetch("http://localhost:3000/api/v1/entities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "FORNECEDOR FIFO SAIDA", entity_type: "PJ" }),
  });
  if (![200, 201].includes(f.status)) throw new Error("Falha fornecedor");
  fornecedor = await f.json();

  // produto
  const p = await fetch("http://localhost:3000/api/v1/produtos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nome: "Produto FIFO Saida",
      categoria: "TESTE",
      fornecedor_id: fornecedor.id,
    }),
  });
  if (![200, 201].includes(p.status)) throw new Error("Falha produto");
  produto = await p.json();

  // ENTRADA inicial de 10 unidades a R$20 (sem frete) -> custo_unitario esperado 20.0000
  const ent = await fetch("http://localhost:3000/api/v1/estoque/movimentos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      produto_id: produto.id,
      tipo: "ENTRADA",
      quantidade: 10,
      valor_unitario: 20,
      frete: 0,
      outras_despesas: 0,
      documento: "NF-ENT-SAIDA-01",
      fifo_enabled: true,
    }),
  });
  if (![200, 201].includes(ent.status)) {
    const txt = await ent.text();
    throw new Error("Falha ENTRADA inicial: " + txt);
  }
});

describe("FIFO - consumo em SAIDA (RED)", () => {
  test("SAIDA deve consumir lote, reduzir quantidade_disponivel e gerar movimento_consumo_lote", async () => {
    // Executa SAIDA de 4 unidades
    const saidaResp = await fetch(
      "http://localhost:3000/api/v1/estoque/movimentos",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produto_id: produto.id,
          tipo: "SAIDA",
          quantidade: 4,
          documento: "SAI-FIFO-01",
          fifo_enabled: true,
        }),
      },
    );
    expect([200, 201]).toContain(saidaResp.status);
    const saidaMov = await saidaResp.json();

    // Consulta lote
    const lotes = await database.query({
      text: `SELECT id, quantidade_inicial, quantidade_disponivel, custo_unitario, valor_total
             FROM estoque_lote WHERE produto_id=$1 ORDER BY id ASC`,
      values: [produto.id],
    });
    expect(lotes.rows.length).toBe(1); // ainda apenas 1 lote
    const lote = lotes.rows[0];

    // Esperado pós implementação: quantidade_disponivel = 6
    expect(Number(lote.quantidade_disponivel)).toBeCloseTo(6, 3);

    // Consumo registrado
    const cons = await database.query({
      text: `SELECT movimento_id, lote_id, quantidade_consumida, custo_unitario_aplicado, custo_total
             FROM movimento_consumo_lote WHERE movimento_id=$1`,
      values: [saidaMov.id],
    });
    expect(cons.rows.length).toBe(1);
    const c = cons.rows[0];
    expect(Number(c.quantidade_consumida)).toBeCloseTo(4, 3);
    expect(Number(c.custo_unitario_aplicado)).toBeCloseTo(20, 4);
    expect(Number(c.custo_total)).toBeCloseTo(80, 4);

    // Movimento deve expor custo reconhecido (média ponderada dos lotes consumidos - aqui só um)
    expect(Number(saidaMov.custo_total_rec)).toBeCloseTo(80, 4);
    expect(Number(saidaMov.custo_unitario_rec)).toBeCloseTo(20, 4);
  });
});
