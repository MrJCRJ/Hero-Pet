/**
 * @jest-environment node
 */
// tests/api/v1/pedidos/summary-lucro.test.js
import orchestrator from "tests/orchestrator.js";
import database from "infra/database.js";

jest.setTimeout(60000);

function randomDigits(len) {
  let s = "";
  for (let i = 0; i < len; i++) s += Math.floor(Math.random() * 10);
  return s;
}

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  // Reset schema for isolation
  await database.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  const mig = await fetch("http://localhost:3000/api/v1/migrations", {
    method: "POST",
  });
  if (![200, 201].includes(mig.status)) {
    throw new Error(`Falha ao aplicar migrações. Status: ${mig.status}`);
  }
});

async function criaParceiroPF(nome = "Cliente PF Teste") {
  const resp = await fetch("http://localhost:3000/api/v1/entities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: nome,
      entity_type: "PF",
      document_digits: randomDigits(11),
      document_pending: false,
      ativo: true,
    }),
  });
  expect([200, 201]).toContain(resp.status);
  return await resp.json();
}

async function criaParceiroPJ(nome = "Fornecedor Teste") {
  const resp = await fetch("http://localhost:3000/api/v1/entities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: nome, entity_type: "PJ" }),
  });
  expect([200, 201]).toContain(resp.status);
  return await resp.json();
}

async function criaProduto(nome = "Produto Teste", preco = 20) {
  const forn = await criaParceiroPJ("FORN LUCRO");
  const resp = await fetch("http://localhost:3000/api/v1/produtos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nome,
      preco_tabela: preco,
      ativo: true,
      fornecedor_id: forn.id,
    }),
  });
  expect([200, 201]).toContain(resp.status);
  return await resp.json();
}

function yyyyMM(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

describe("Resumo com COGS real (pedido_itens.custo_total_item)", () => {
  test("Apura COGS real no mês e calcula lucro/margem", async () => {
    const cliente = await criaParceiroPF();
    const prod = await criaProduto("Racao", 20);

    // Entrada: custo 10, quantidade 5
    const entrada = await fetch(
      "http://localhost:3000/api/v1/estoque/movimentos",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produto_id: prod.id,
          tipo: "ENTRADA",
          quantidade: 5,
          valor_unitario: 10,
        }),
      },
    );
    expect([200, 201]).toContain(entrada.status);

    // Venda: preço 20, quantidade 3 => receita 60; COGS real 3*10 = 30; lucro 30; margem 50%
    const venda = await fetch("http://localhost:3000/api/v1/pedidos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: "VENDA",
        partner_entity_id: cliente.id,
        partner_name: cliente.name,
        itens: [{ produto_id: prod.id, quantidade: 3, preco_unitario: 20 }],
      }),
    });
    expect([200, 201]).toContain(venda.status);
    const pedido = await venda.json();

    // Verifica que item gravou custo
    const getPedido = await fetch(
      `http://localhost:3000/api/v1/pedidos/${pedido.id}`,
    );
    const pedBody = await getPedido.json();
    expect(Array.isArray(pedBody.itens)).toBe(true);
    expect(Number(pedBody.itens[0].custo_unit_venda)).toBe(10);
    expect(Number(pedBody.itens[0].custo_total_item)).toBe(30);

    // Summary do mês corrente
    const month = yyyyMM(new Date());
    // Adiciona nocache=1 para evitar reutilizar payload de cache in-memory
    // de execuções anteriores da suíte (cache persiste entre testes apesar do DROP SCHEMA).
    const sum = await fetch(
      `http://localhost:3000/api/v1/pedidos/summary?month=${month}&nocache=1`,
    );
    expect(sum.status).toBe(200);
    const json = await sum.json();
    expect(json).toHaveProperty("vendasMes");
    expect(json).toHaveProperty("cogsReal");
    expect(json).toHaveProperty("lucroBrutoMes");
    expect(json).toHaveProperty("margemBrutaPerc");
    expect(Number(json.vendasMes)).toBe(60);
    expect(Number(json.cogsReal)).toBe(30);
    expect(Number(json.lucroBrutoMes)).toBe(30);
    expect(Number(json.margemBrutaPerc)).toBe(50);
  });
});
