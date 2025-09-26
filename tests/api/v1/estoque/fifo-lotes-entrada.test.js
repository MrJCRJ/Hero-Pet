/** @jest-environment node */
// tests/api/v1/estoque/fifo-lotes-entrada.test.js
// Fase 1 FIFO: teste TDD garantindo que ao registrar uma ENTRADA
// (com feature flag FIFO_ENABLED=1) é criado um lote correspondente.
// Neste momento o endpoint ainda não implementa a lógica, então o
// teste deve inicialmente falhar (RED) até ajustarmos a rota.

import orchestrator from "tests/orchestrator.js";
import database from "infra/database.js";

jest.setTimeout(60000);

let produto;
let fornecedor;

beforeAll(async () => {
  process.env.FIFO_ENABLED = "1"; // força flag ativa no ambiente de teste
  await orchestrator.waitForAllServices();
  await database.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  const mig = await fetch("http://localhost:3000/api/v1/migrations", {
    method: "POST",
  });
  if (![200, 201].includes(mig.status)) {
    throw new Error(`Falha ao migrar schema. status=${mig.status}`);
  }

  // cria fornecedor PJ
  const f = await fetch("http://localhost:3000/api/v1/entities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "FORNECEDOR FIFO", entity_type: "PJ" }),
  });
  if (![200, 201].includes(f.status)) {
    const t = await f.text();
    throw new Error(`Falha fornecedor. status=${f.status} body=${t}`);
  }
  fornecedor = await f.json();

  // cria produto
  const p = await fetch("http://localhost:3000/api/v1/produtos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nome: "Produto FIFO Entrada",
      categoria: "TESTE",
      fornecedor_id: fornecedor.id,
    }),
  });
  if (![200, 201].includes(p.status)) {
    throw new Error(`Falha produto. status=${p.status}`);
  }
  produto = await p.json();
});

describe("FIFO - criação de lote na ENTRADA", () => {
  test("Ao inserir ENTRADA deve existir 1 lote com quantidade_disponivel igual à quantidade", async () => {
    // executa ENTRADA
    const resp = await fetch(
      "http://localhost:3000/api/v1/estoque/movimentos",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produto_id: produto.id,
          tipo: "ENTRADA",
          quantidade: 7,
          valor_unitario: 10.0,
          frete: 3.5,
          outras_despesas: 0,
          documento: "NF-FIFO-01",
          fifo_enabled: true,
        }),
      },
    );
    expect([200, 201]).toContain(resp.status);

    // consulta diretamente tabela de lotes
    const client = await database.getClient();
    try {
      const lotes = await client.query({
        text: `SELECT produto_id, quantidade_inicial, quantidade_disponivel, custo_unitario, valor_total, origem_tipo
               FROM estoque_lote WHERE produto_id=$1 ORDER BY id ASC`,
        values: [produto.id],
      });
      // Esperado: ainda não implementado => lotes.rows.length === 0 (RED)
      // Após implementação: length === 1 e valores coerentes.
      expect(lotes.rows.length).toBe(1);
      const l = lotes.rows[0];
      expect(Number(l.quantidade_inicial)).toBeCloseTo(7, 3);
      expect(Number(l.quantidade_disponivel)).toBeCloseTo(7, 3);
      // custo_unitario = (quantidade * valor_unitario + frete + outras) / quantidade
      // custo_total = 7*10 + 3.5 = 73.5 => custo_unitario=10.5
      expect(Number(l.custo_unitario)).toBeCloseTo(10.5, 4);
      expect(Number(l.valor_total)).toBeCloseTo(73.5, 4);
      expect(l.origem_tipo).toBe("ENTRADA");
    } finally {
      await database.safeRollback(); // noop se não em transação
    }
  });
});
